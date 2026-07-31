export default class SampleReconPlugin {
  async initialize(context) {
    context.logger.log('Recon Enhancer plugin initialized successfully!');
    context.logger.log(`Capabilities: ${context.manifest.capabilities.join(', ')}`);
  }

  async shutdown() {
    console.log('Sample Recon Plugin shutting down.');
  }
}
