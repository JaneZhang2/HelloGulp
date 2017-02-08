export default{
  immediate: (cb) => {
    cb('foo', 'bar');
  },
  debounce: (cb) => {
    setTimeout(cb, 0);
  }
};
