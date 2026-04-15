import os
import time
import math
import random
import requests
import socketio
import polyline

API_URL = os.getenv("API_URL", "http://localhost:3000/api")
SOCKET_URL = os.getenv("SOCKET_URL", "http://localhost:3000")
OSRM_URL = os.getenv("OSRM_URL", "https://router.project-osrm.org")
ENABLE_RANDOM_DISPATCH = os.getenv("ENABLE_RANDOM_DISPATCH", "true").lower() == "true"

sio = socketio.Client()

def distance(lat1, lon1, lat2, lon2):
    R = 6371e3
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi/2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda/2.0)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

class Simulation:
    def __init__(self):
        self.ambulances = []
        self.signals = []
        self.active_dispatches = {}
        self.running = False
        
        # Load state
        self.load_state()
        
    def load_state(self):
        try:
            self.ambulances = requests.get(f"{API_URL}/ambulances", timeout=10).json()
            self.signals = requests.get(f"{API_URL}/signals", timeout=10).json()
            print(f"Loaded {len(self.ambulances)} ambulances and {len(self.signals)} signals")
        except Exception as e:
            print("Error loading state:", e)

    def dispatch_ambulance(self, ambulance_id, target_lat, target_lng, emergency_id=None):
        # find ambulance
        amb = next((a for a in self.ambulances if a['id'] == ambulance_id), None)
        if not amb: return
        
        # Call OSRM
        osrm_url = f"{OSRM_URL}/route/v1/driving/{amb['lng']},{amb['lat']};{target_lng},{target_lat}?overview=full"
        res = requests.get(osrm_url, timeout=15).json()
        if res.get('code') == 'Ok':
            route = res['routes'][0]
            route_poly = route['geometry']
            coords = polyline.decode(route_poly) # Returns (lat, lon) list
            print(f"Ambulance {ambulance_id} dispatched. Route has {len(coords)} points.")
            
            # Start moving task
            amb['route'] = coords
            amb['route_idx'] = 0
            amb['target_emergency_id'] = emergency_id
            amb['status'] = 'EN_ROUTE'
            self.active_dispatches[ambulance_id] = emergency_id
            sio.emit('ambulance:route', {
                'ambulance_id': amb['id'],
                'emergency_id': emergency_id,
                'geometry': [{'lat': lat, 'lng': lon} for lat, lon in coords],
                'distance_m': route.get('distance'),
                'duration_s': route.get('duration')
            })
            sio.emit('ambulance:update', {'id': amb['id'], 'lat': amb['lat'], 'lng': amb['lng'], 'status': amb['status']})
    
    def step(self):
        # Move ambulances that are routing
        for amb in self.ambulances:
            if amb.get('status') == 'EN_ROUTE' and 'route' in amb:
                idx = amb['route_idx']
                if idx < len(amb['route']):
                    nxt_lat, nxt_lon = amb['route'][idx]
                    amb['lat'] = nxt_lat
                    amb['lng'] = nxt_lon
                    # Advance index faster to simulate driving
                    amb['route_idx'] += min(3, len(amb['route']) - idx)
                    
                    sio.emit('ambulance:update', {'id': amb['id'], 'lat': amb['lat'], 'lng': amb['lng'], 'status': amb['status']})
                    
                    # Smart signals check
                    for sig in self.signals:
                        dist = distance(nxt_lat, nxt_lon, sig['lat'], sig['lng'])
                        if dist < 500 and sig['current_state'] != 'GREEN':
                            print(f"[Smart City] Signal {sig['id']} overriding to GREEN for approaching ambulance")
                            sig['current_state'] = 'GREEN'
                            sio.emit('signal:update', {'id': sig['id'], 'state': 'GREEN'})
                        elif dist > 1000 and sig['current_state'] == 'GREEN':
                            print(f"[Smart City] Signal {sig['id']} reverting to RED")
                            sig['current_state'] = 'RED'
                            sio.emit('signal:update', {'id': sig['id'], 'state': 'RED'})
                            
                else:
                    print(f"Ambulance {amb['id']} arrived at destination.")
                    sio.emit('dispatch:arrived', {
                        'ambulance_id': amb['id'],
                        'emergency_id': amb.get('target_emergency_id') or self.active_dispatches.get(amb['id'])
                    })
                    amb['status'] = 'AVAILABLE'
                    sio.emit('ambulance:update', {'id': amb['id'], 'lat': amb['lat'], 'lng': amb['lng'], 'status': amb['status']})
                    del amb['route']
                    amb.pop('target_emergency_id', None)
                    self.active_dispatches.pop(amb['id'], None)

def main():
    # Wait for backend to be ready
    for _ in range(10):
        try:
            requests.get(API_URL + "/ambulances", timeout=10)
            break
        except:
            time.sleep(1)
            
    sio.connect(SOCKET_URL)
    sim = Simulation()
    sim.running = True
    
    @sio.on('dispatch:manual')
    def on_manual_dispatch(data):
        print(f"Manual dispatch received for Ambulance {data['ambulance_id']}")
        sim.dispatch_ambulance(data['ambulance_id'], data['lat'], data['lng'], data.get('emergency_id'))
        
    
    while sim.running:
        # Dispatch random available ambulances continuously to make it crowded
        available = [a for a in sim.ambulances if a.get('status') == 'AVAILABLE']
        
        # Dispatch up to 3 ambulances per tick if available
        if ENABLE_RANDOM_DISPATCH and available and random.random() < 0.5:
            targets = random.sample(available, min(len(available), 3))
            for test_amb in targets:
                target_lat = random.uniform(18.91, 19.11)
                target_lng = random.uniform(72.81, 72.87)
                sim.dispatch_ambulance(test_amb['id'], target_lat, target_lng)
        
        sim.step()
        time.sleep(1.5) # 1.5 seconds between updates

if __name__ == '__main__':
    main()
