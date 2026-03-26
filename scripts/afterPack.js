// afterPack hook — currently a no-op.
// Electron Fuses disabled: caused black screen on older Intel Macs.
// Re-enable once tested on Intel hardware.
module.exports = async function afterPack(context) {
  console.log(`afterPack: ${context.appOutDir} (fuses disabled)`);
};
