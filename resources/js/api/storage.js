const get = (key) => localStorage.getItem(key) || sessionStorage.getItem(key);

const remove = (key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
};

export default { get, remove };
