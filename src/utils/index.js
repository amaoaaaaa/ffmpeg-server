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

/**
 * 简单的 console.log 输出管理
 */
class Log {
    constructor() {
        this.logs = [];
    }

    /**
     * 添加一行 log
     * @param  {...any} p 内容
     */
    add(...p) {
        this.logs.push(p.join(" "));
    }

    /**
     * 输出到控制台
     */
    echo() {
        console.log(this.logs.join("\n\n"));

        this.logs.length = 0;
    }
}

module.exports = {
    logDivider,
    toEven,
    Log,
};
