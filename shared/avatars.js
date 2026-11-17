"use strict"

// Avatar options offered in the lobby. The server only accepts values from
// these lists, so the client reads them from here too.

const AVATAR_COLORS = [
    "#F14E4E", "#F2B616", "#7ABF0C", "#37C3EE",
    "#F95DCF", "#3C45DD", "#FA7E1A", "#2BD49F",
    "#901BEF", "#BF0043", "#537818", "#545454",
]

const AVATAR_STYLES = ["default", "ninja", "tie"]

module.exports = { AVATAR_COLORS, AVATAR_STYLES }
