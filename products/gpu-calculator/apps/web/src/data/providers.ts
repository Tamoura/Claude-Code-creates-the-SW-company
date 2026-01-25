import type { Provider } from '../types';

/**
 * Provider metadata
 * To be populated with actual provider data
 */
export const providers: Provider[] = [
  {
    id: 'aws',
    name: 'Amazon Web Services',
    shortName: 'AWS',
    website: 'https://aws.amazon.com',
    pricingUrl: 'https://aws.amazon.com/ec2/pricing/on-demand/',
    logoPath: '/assets/logos/aws.svg',
    type: 'hyperscaler'
  },
  {
    id: 'gcp',
    name: 'Google Cloud Platform',
    shortName: 'GCP',
    website: 'https://cloud.google.com',
    pricingUrl: 'https://cloud.google.com/compute/gpus-pricing',
    logoPath: '/assets/logos/gcp.svg',
    type: 'hyperscaler'
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    shortName: 'Azure',
    website: 'https://azure.microsoft.com',
    pricingUrl: 'https://azure.microsoft.com/en-us/pricing/details/virtual-machines/',
    logoPath: '/assets/logos/azure.svg',
    type: 'hyperscaler'
  },
  {
    id: 'lambda-labs',
    name: 'Lambda Labs',
    shortName: 'Lambda',
    website: 'https://lambdalabs.com',
    pricingUrl: 'https://lambdalabs.com/service/gpu-cloud',
    logoPath: '/assets/logos/lambda-labs.svg',
    type: 'gpu-cloud'
  },
];
