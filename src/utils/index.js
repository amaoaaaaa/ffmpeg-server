/**
 * 在控制台输出分割线
 */
const logDivider = () => {
    console.log("");
    console.log("--------------------------------------------------------------");
    console.log("");
};

/**
 * 强行把一个奇数+1转成偶数
 * @param {Number} num - 原数值
 * @returns {Number} 偶数
 */
const toEven = (num) => {
    if (num % 2 === 1) {
        num++;
    }

    return num;
};

module.exports = {
    logDivider,
    toEven,
};
