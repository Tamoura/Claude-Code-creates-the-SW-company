import type { Provider } from '../types';

/**
 * All GPU cloud provider metadata
 * Updated: January 2025
 */
export const providers: Provider[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    website: 'https://aws.amazon.com',
    pricingUrl: 'https://aws.amazon.com/ec2/pricing/on-demand/',
    logoPath: '/assets/logos/aws.svg',
    type: 'hyperscaler',
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    website: 'https://cloud.google.com',
    pricingUrl: 'https://cloud.google.com/compute/gpus-pricing',
    logoPath: '/assets/logos/gcp.svg',
    type: 'hyperscaler',
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    website: 'https://azure.microsoft.com',
    pricingUrl: 'https://azure.microsoft.com/en-us/pricing/details/virtual-machines/',
    logoPath: '/assets/logos/azure.svg',
    type: 'hyperscaler',
  },
  {
    id: 'lambda-labs',
    name: 'Lambda Labs',
    shortName: 'Lambda',
    website: 'https://lambdalabs.com',
    pricingUrl: 'https://lambdalabs.com/service/gpu-cloud',
    logoPath: '/assets/logos/lambda-labs.svg',
    type: 'gpu-cloud',
  },
  {
    id: 'runpod',
    name: 'RunPod',
    shortName: 'RunPod',
    website: 'https://www.runpod.io',
    pricingUrl: 'https://www.runpod.io/gpu-instance/pricing',
    logoPath: '/assets/logos/runpod.svg',
    type: 'gpu-cloud',
  },
  {
    id: 'vast-ai',
    name: 'Vast.ai',
    shortName: 'Vast.ai',
    website: 'https://vast.ai',
    pricingUrl: 'https://vast.ai/pricing',
    logoPath: '/assets/logos/vast-ai.svg',
    type: 'marketplace',
  },
  {
    id: 'coreweave',
    name: 'CoreWeave',
    shortName: 'CoreWeave',
    website: 'https://www.coreweave.com',
    pricingUrl: 'https://www.coreweave.com/pricing',
    logoPath: '/assets/logos/coreweave.svg',
    type: 'gpu-cloud',
  },
];
