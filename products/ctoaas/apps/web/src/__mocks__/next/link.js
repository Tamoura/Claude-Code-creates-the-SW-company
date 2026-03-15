const React = require("react");

function MockLink({ href, children, ...props }) {
  return React.createElement("a", { href, ...props }, children);
}

module.exports = MockLink;
module.exports.default = MockLink;
module.exports.__esModule = true;
