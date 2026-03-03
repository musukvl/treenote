// No-op code signing — skips winCodeSign download that fails without admin privileges.
// Referenced by electron-builder.yml win.sign
exports.default = async function () {
  // intentionally empty — no code signing
};
