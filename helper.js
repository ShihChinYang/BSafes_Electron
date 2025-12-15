const helper = {
    isContainer: (itemType) => {
        if (itemType === "B" || itemType === "F" || itemType === "N" || itemType === "D") return true;
        return false;
    }
}
module.exports = helper;