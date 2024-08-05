"use strict";
// 学习手写Promise源码
/*
    Promise有三个状态：pending(进行中)、fulfilled(已成功)、rejected(已失败)

    伪代码：
    const test = new Promise((resolve, reject) => {...});
    当new Promise的时候，会立即在构造函数中执行传入的回调函数

    test.then(res => {...}, err => {...});
    当实例 test 使用.then方法时会接收两个参数（成功回调函数和失败回调函数，非必传），
    然后会new一个新的Promise并返回，
    如上面所说，当有一个新的Promise时候，会立即执行传入的回调函数，
    那么我们就需要在这个回调函数中根据 test 这个实例的当前的状态进行不同的操作，
        1. fulfilled状态，执行then接收的第一个参数（成功回调函数）
        2. rejected状态，执行then接收的第二个参数（失败回调函数）
        3. pending状态，就保存then接收的两个回调函数到 实例test 中，等待实例 test 的状态发生改变，然后执行相应的回调函数
    

*/
class MyPromise {
    constructor(fn) {
        // 状态
        this.status = 'pending';
        // 保存成功的回调
        this.fulfilledCallbacks = [];
        // 保存失败的回调
        this.rejectedCallbacks = [];
        // ----------------------实例方法开始↓----------------------------//
        this.then = (fulfilledFn, rejectedFn) => {
            // 处理函数，判断是否是函数，如果不是则返回原值
            fulfilledFn = typeof fulfilledFn === 'function' ? fulfilledFn : (value) => value;
            rejectedFn = typeof rejectedFn === 'function' ? rejectedFn : (error) => { throw error; };
            // 返回一个新的MyPromise，成功时候的回调是fulfilledFn，失败时候的回调是rejectedFn
            return new MyPromise((resolve, reject) => {
                // 成功时候的回调
                const fulfilledCallback = () => {
                    try {
                        resolve(fulfilledFn(this.value));
                    }
                    catch (error) {
                        reject(error);
                    }
                };
                // 失败时候的回调
                const rejectedCallback = () => {
                    try {
                        reject(rejectedFn(this.reason));
                    }
                    catch (error) {
                        reject(error);
                    }
                };
                if (this.status === 'fulfilled') {
                    // 执行成功的回调
                    fulfilledCallback();
                }
                else if (this.status === 'rejected') {
                    // 执行失败的回调
                    rejectedCallback();
                }
                else if (this.status === 'pending') {
                    // 如果状态还是pending，则将成功的回调和失败的回调保存起来
                    this.fulfilledCallbacks.push(fulfilledCallback);
                    this.rejectedCallbacks.push(rejectedCallback);
                }
                ;
            });
        };
        this.catch = (rejectedFn) => {
            return this.then(null, rejectedFn);
        };
        // 初始状态为pending
        this.status = 'pending';
        // 成功的回调
        const resolve = (value) => {
            if (this.status === 'pending') {
                // 如果成功，状态改为fulfilled，保存成功信息
                this.status = 'fulfilled';
                this.value = value;
                // 当状态为fulfilled的时候，执行所有保存的成功的回调
                this.fulfilledCallbacks.forEach((callback) => callback());
            }
        };
        // 失败的回调
        const reject = (error) => {
            if (this.status === 'pending') {
                // 如果失败，状态改为rejected，并保存失败信息
                this.status = 'rejected';
                this.reason = error;
                // 当状态为rejected的时候，执行所有保存的失败的回调
                this.rejectedCallbacks.forEach((callback) => callback());
            }
        };
        try {
            // new MyPromise的时候执行传入的函数，并将resolve和reject作为参数传入
            // 使用者接传入的函数会接收到两个参数，分别是resolve和reject
            fn(resolve, reject);
        }
        catch (error) {
            reject(error);
        }
    }
    ;
    finally(callback) {
        return this.then(callback, callback);
    }
    ;
}
// ----------------------实例方法结束↑----------------------------//
// ----------------------静态方法开始↓----------------------------//
// 返回一个 fulfilled 的Promise
MyPromise.resolve = (value) => {
    // 如果是MyPromise，直接返回
    if (value instanceof MyPromise)
        return value;
    // 否则返回一个成功的MyPromise
    return new MyPromise((resolve) => {
        resolve(value);
    });
};
// 返回一个 rejected 的Promise
MyPromise.reject = (error) => {
    // 如果是MyPromise，直接返回
    if (error instanceof MyPromise)
        return error;
    // 否则返回一个失败的MyPromise
    return new MyPromise((_, reject) => {
        reject(error);
    });
};
// 接受一个可迭代对象（如数组），并返回一个新的 Promise
MyPromise.all = (promises) => {
    // 将数组中的每个元素都包装成MyPromise
    const nPromises = promises.map(promise => {
        return promise instanceof MyPromise ? promise : MyPromise.resolve(promise);
    });
    // 所有 Promise 的结果
    const results = [];
    return new MyPromise((resolve, reject) => {
        // 遍历所有的Promise，如果有一个失败，则直接返回失败
        // 如果所有Promise都成功，返回成功
        for (let promise of nPromises) {
            promise.then((res) => {
                // 保存成功的结果
                results.push(res);
                // 如果所有Promise都成功，返回成功
                if (results.length === promises.length) {
                    resolve(results);
                }
            }).catch((err) => {
                // 如果有一个失败，则直接返回失败
                reject(err);
            });
        }
    });
};
MyPromise.allSettled = (promises) => {
    // 将数组中的每个元素都包装成MyPromise
    const nPromises = promises.map(promise => {
        return promise instanceof MyPromise ? promise : MyPromise.resolve(promise);
    });
    // 所有 Promise 的结果以及状态
    const result = [];
    let settledCount = 0;
    return new MyPromise((resolve, reject) => {
        for (let promise of nPromises) {
            promise.then((res) => {
                result.push({
                    status: 'fulfilled',
                    value: res
                });
            }).catch((err) => {
                result.push({
                    status: 'rejected',
                    reason: err
                });
            }).finally(() => {
                settledCount++;
                if (settledCount === promises.length) {
                    resolve(result);
                }
            });
        }
        ;
    });
};
MyPromise.race = (promises) => {
    // 将数组中的每个元素都包装成MyPromise
    const nPromises = promises.map(promise => {
        return promise instanceof MyPromise ? promise : MyPromise.resolve(promise);
    });
    return new MyPromise((resolve, reject) => {
        // 轮询promise，有结果直接调用resolve或reject
        for (let promise of nPromises) {
            promise.then((res) => resolve(res)).catch((res) => reject(res));
        }
    });
};
;
const promise1 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        resolve(1);
    }, 2000);
});
const promise2 = new MyPromise((resolve, reject) => {
    setTimeout(() => {
        reject(2);
    }, 1000);
});
MyPromise.race([promise1, promise2]).then((res) => {
    console.log('then', res);
}).catch((res) => console.log(res));
