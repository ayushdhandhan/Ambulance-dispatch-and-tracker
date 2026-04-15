const normalizeIndianPhone = (value) => {
  if (!value) {
    return null;
  }

  const compact = String(value).replace(/[^\d+]/g, '');

  if (/^\+91\d{10}$/.test(compact)) {
    return compact;
  }

  if (/^91\d{10}$/.test(compact)) {
    return `+${compact}`;
  }

  if (/^\d{10}$/.test(compact)) {
    return `+91${compact}`;
  }

  return null;
};

module.exports = {
  normalizeIndianPhone,
};
