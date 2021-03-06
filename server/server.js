const path = require('path');
const bp = require('body-parser');
// 引入自定义 mysql 工具
const mysql = require(path.join(__dirname, './mysql.js'));
// 引入 express
const express = require('express');
// 获取 express 实例对象
let app = express();
// 允许跨域访问
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Content-Length, Authorization, Accept, X-Requested-With , yourHeaderFeild'
  );
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');

  if (req.method == 'OPTIONS') {
    res.send(200);
    /让options请求快速返回/;
  } else {
    next();
  }
});

// 设置托管静态资源
// app.use(express.static(path.join(__dirname, './public')));
// 处理 post 请求参数
app.use(
  bp.urlencoded({
    extended: false
  })
);
app.get('/', (req, res) => {
  res.send({
    msd: 'server ok',
    code: 200
  });
});

// 前端响应要创建订单的数据对象
app.get('/api/alipay/payinfo', (req, res) => {
  let data = req.query;
  // 做一个简单的商品判断
  if (
    data &&
    ['口罩', '可乐', 'N95', '消毒水', '炸鸡'].includes(data.goodsName) &&
    data.count &&
    data.cost
  ) {
    res.send(
      Object.assign(data, {
        code: 200
      })
    );
  } else {
    res.send({
      msd: '商品信息错误，请重新提交',
      code: 500
    });
  }
});

// 获取创建订单的自定义模块
const createOrder = require(path.join(__dirname, './createOrder.js')).createOrder;
// 获取验签自定义模块
const checkSign = require(path.join(__dirname, './checkSign.js'));

// 生成订单请求
app.post('/api/alipay/createOrder', (req, res) => {
  req.body.pack_params = {
    payName: req.body.payName,
    goodsName: req.body.goodsName,
    price: req.body.price,
    count: req.body.count,
    cost: req.body.cost
  };
  async function asyncCreate() {
    const result = await createOrder(req.body);
    res.send(result);
  }
  asyncCreate();
});

app.post('/api/alipay/notify', (req, res) => {
  // 输出验签结果
  async function checkResult(postData) {
    let result = await checkSign(postData);
    if (result) {
      // console.log('订单成功支付！！！请做处理')
      // console.log(req.body);
      let data = req.body;
      let goods = JSON.parse(data.passback_params);
      let sqlStr = `
            insert into order_list value("${data.out_trade_no}",
                "${data.trade_no}",
                "${goods.goodsName}",
                ${goods.price},
                ${goods.count},
                ${data.total_amount},
                "支付成功",
                "${goods.payName}");
            `;
      // 响应支付宝 success 处理成功，否则支付宝会一直定时发送异步通知
      res.end('success');
      mysql.addSql(sqlStr);
    }
  }
  checkResult(req.body);
});

// 查询订单接口
app.get('/api/alipay/getorder', (req, res) => {
  mysql.selectSql('select * from order_list', (err, result) => {
    result = Object.assign({
      code: 200,
      msg: '获取成功',
      list: result
    });
    res.send(result);
  });
});

app.listen(8888, () => {
  console.log('server start with 8888...');
});
