module.exports = (contents = '') => {
  const updated = contents
    .replace(/\/\* html \*\/\s+`\s+/g, '`')
    .replace(/>\s+</g, '><')
    .replace(/>\s+`/g, '>`');
  // console.log(updated.slice(0, 1500))
  return updated;
};
