const helloService = require("../services/helloService");

exports.sayHello = (req, res) => {
  const message = helloService.getMessage();
  res.json({ message });
};