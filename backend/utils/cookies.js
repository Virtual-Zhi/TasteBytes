function parseCookies(cookieHeader) {
    const cookies = {};
    if (!cookieHeader) return cookies;
    cookieHeader.split(";").forEach(cookie => {
        const [name, value] = cookie.trim().split("=");
        cookies[name] = value;
    });
    return cookies;
}

module.exports = { parseCookies };
