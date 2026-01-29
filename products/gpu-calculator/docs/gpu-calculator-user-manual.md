# GPU Calculator - User Manual

**Version**: 1.0
**Last Updated**: 2026-01-28
**Product**: GPU Calculator

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Using the Training Cost Calculator](#using-the-training-cost-calculator)
4. [Using the Inference Cost Calculator](#using-the-inference-cost-calculator)
5. [Understanding Your Results](#understanding-your-results)
6. [Quick Start Presets](#quick-start-presets)
7. [Provider Comparison](#provider-comparison)
8. [Frequently Asked Questions](#frequently-asked-questions)
9. [Troubleshooting](#troubleshooting)

---

## Introduction

### What is GPU Calculator?

GPU Calculator is a free, open-source web application that helps AI startups and ML practitioners quickly estimate and compare GPU computing costs across all major cloud providers. In under 2 minutes, you can input your workload parameters and receive a comprehensive Total Cost of Ownership (TCO) breakdown.

### Who Is This For?

- **AI/ML Engineers** - Get accurate cost estimates for training runs and avoid budget surprises
- **Startup Founders** - Compare providers for best value and justify infrastructure spend to investors
- **DevOps/Platform Engineers** - Model inference costs at scale and plan for production workloads

### Key Features

- **Fast Estimates** - Get complete cost breakdown in under 2 minutes
- **7 Major Providers** - Compare AWS, GCP, Azure, Lambda Labs, RunPod, Vast.ai, and CoreWeave
- **Comprehensive TCO** - Includes compute, storage, and networking costs
- **No Account Required** - All calculations performed client-side in your browser
- **Mobile Responsive** - Works on any device

---

## Getting Started

### Accessing the Calculator

1. Open your web browser (Chrome, Firefox, Safari, or Edge)
2. Navigate to the GPU Calculator website
3. No signup or login required - start calculating immediately

### Basic Workflow

The calculator helps you estimate costs in three simple steps:

1. **Choose Calculator Type** - Training or Inference
2. **Enter Your Parameters** - Model size, dataset, workload details
3. **View Results** - Compare costs across all providers

---

## Using the Training Cost Calculator

### When to Use

Use the Training Calculator when you need to estimate the cost of training an AI/ML model from scratch or fine-tuning an existing model.

### Step-by-Step Guide

#### 1. Select the Training Tab

Click on the "Training" tab at the top of the calculator.

#### 2. Enter Model Parameters

**Model Size (Billions of Parameters)**
- Enter the size of your model in billions of parameters
- Examples:
  - Small models: 0.5B - 1B (BERT, DistilBERT)
  - Medium models: 7B - 13B (Llama 2, Mistral)
  - Large models: 30B - 70B (Llama 2 70B, Falcon 40B)
  - Extra large: 175B+ (GPT-3, GPT-4)

**Dataset Size (GB)**
- Enter the size of your training dataset in gigabytes
- Includes all training data, validation sets, and test sets

**Number of Epochs**
- Enter how many complete passes through your dataset you plan to make
- Typical range: 3-10 epochs for most training runs

#### 3. Select GPU Configuration

**GPU Type**
- Choose from available GPU types:
  - **H100** - Fastest, most expensive (80GB memory)
  - **A100** - Best balance of performance and cost (40GB or 80GB)
  - **A10** - Cost-effective for smaller models (24GB)
  - **L4** - Inference-optimized, good for smaller training (24GB)
  - **T4** - Budget option for smaller workloads (16GB)

**GPU Count**
- Select number of GPUs: 1, 2, 4, 8, or more
- More GPUs = faster training but higher cost
- Ensure GPU count is appropriate for your model size

**Multi-Node Training** (Optional)
- For very large models requiring more than 8 GPUs
- Specify number of nodes (machines)

#### 4. Configure Storage

**Dataset Storage**
- Automatically calculated based on your dataset size
- Uses object storage pricing (S3, GCS, etc.)

**Checkpoint Frequency**
- Specify how often you want to save model checkpoints
- More frequent checkpoints = higher storage costs
- Options: None, Hourly, Every 10 epochs, Daily

#### 5. Click "Calculate"

View your complete cost breakdown across all providers.

### Example Training Calculation

**Scenario**: Training a 7B parameter model

```
Model Size: 7B parameters
Dataset Size: 100GB
Epochs: 3
GPU Type: A100 (80GB)
GPU Count: 4
Checkpoint Frequency: Every 10 epochs

Estimated Training Time: ~24 hours
Estimated Cost Range: $200 - $500 (depending on provider)
```

---

## Using the Inference Cost Calculator

### When to Use

Use the Inference Calculator when you need to estimate the cost of serving a trained model to make predictions at scale.

### Step-by-Step Guide

#### 1. Select the Inference Tab

Click on the "Inference" tab at the top of the calculator.

#### 2. Enter Inference Parameters

**Model Size (Billions of Parameters)**
- Enter the size of your deployed model
- Same scale as training calculator

**Requests per Second (or per Day)**
- Enter expected request volume
- Examples:
  - Low traffic: 1-10 requests/second
  - Medium traffic: 10-100 requests/second
  - High traffic: 100-1000+ requests/second

**Batch Size**
- Number of requests processed together
- Larger batches = better GPU utilization but higher latency
- Typical range: 1-32

#### 3. Specify Latency Requirements

**Latency Tier**
- **Real-time (<100ms)** - Requires more GPUs, lower utilization, higher cost
- **Standard (<500ms)** - Balanced performance and cost
- **Batch (>1s)** - Maximum cost savings, best for offline processing

#### 4. Configure Networking

**Average Response Size (KB)**
- Estimate the size of a typical model response
- Used to calculate data egress costs
- Examples:
  - Text responses: 1-10 KB
  - JSON API responses: 5-50 KB
  - Large outputs: 100+ KB

#### 5. Click "Calculate"

View your monthly inference costs across all providers.

### Example Inference Calculation

**Scenario**: Serving a chatbot API

```
Model Size: 7B parameters
Requests per Second: 10
Batch Size: 4
Latency Tier: Standard (<500ms)
Average Response Size: 5 KB

Recommended: 2x A100 GPUs
Monthly Cost Range: $1,500 - $3,500 (depending on provider)
Monthly Egress: Approximately 13GB
```

---

## Understanding Your Results

### Total Cost of Ownership (TCO)

Your results show the complete TCO breakdown:

**Compute Costs**
- GPU rental fees (hourly rate × hours used)
- Largest component of TCO (typically 70-90%)

**Storage Costs**
- Dataset storage in object storage
- Model checkpoint storage
- Typically 5-15% of TCO

**Networking Costs**
- Data transfer out (egress)
- Important for high-volume inference
- Can be 5-20% of TCO for inference workloads

### Provider Comparison View

Results are displayed in a side-by-side comparison showing:

- **Total Cost** - Complete TCO per provider
- **Compute Breakdown** - GPU type, hourly rate, total hours
- **Storage Details** - Per-GB rate, total storage
- **Network Costs** - Egress rate and volume
- **Availability** - Whether provider supports your configuration

### Sorting and Filtering

- **Sort by Cost** - Default, shows lowest cost first
- **Hide Unavailable** - Filter out providers that can't support your config
- **View Details** - Expand any provider to see full breakdown

---

## Quick Start Presets

### Using Presets

Click any preset button to auto-fill the calculator with common scenarios:

**Available Presets:**

1. **7B Model Training**
   - Small language model training
   - Good for: LoRA fine-tuning, smaller models

2. **70B Model Training**
   - Large language model training
   - Good for: Full model training, high-performance needs

3. **LLM API Serving**
   - Text generation API at scale
   - Good for: Chatbots, content generation

4. **Image Model Serving**
   - Image generation or classification
   - Good for: Stable Diffusion, image APIs

### Customizing Presets

After selecting a preset:
1. Review the auto-filled values
2. Adjust any parameter to match your needs
3. Click "Calculate" to update results

---

## Provider Comparison

### Supported Providers

**Cloud Providers**
- **AWS** - Broadest selection, premium pricing
- **GCP** - Competitive pricing, good H100 availability
- **Azure** - Enterprise support, integrated services

**GPU-Specialized Providers**
- **Lambda Labs** - Simple pricing, developer-friendly
- **RunPod** - Spot pricing, community cloud options
- **Vast.ai** - P2P marketplace, cheapest options
- **CoreWeave** - High-performance, Kubernetes-native

### How to Choose a Provider

**Considerations:**

1. **Cost** - Compare total TCO, not just GPU hourly rates
2. **Availability** - Does provider have GPUs available now?
3. **Network** - Check egress costs for high-volume inference
4. **Integration** - Consider existing cloud infrastructure
5. **Support** - Evaluate support quality and SLAs

**Recommendations by Use Case:**

- **Training (one-time)**: Choose lowest cost with GPU availability
- **Production Inference**: Balance cost with uptime guarantees
- **Experiments**: Try Vast.ai or RunPod spot instances
- **Enterprise**: AWS, GCP, or Azure for compliance needs

---

## Frequently Asked Questions

### General Questions

**Q: Is GPU Calculator really free?**

A: Yes, completely free and open-source. No accounts, no hidden fees, no upsells.

**Q: How accurate are the estimates?**

A: Estimates are designed to be within 20% of actual costs. Actual costs may vary based on:
- Specific GPU availability
- Your actual utilization efficiency
- Provider promotional pricing
- Network usage patterns

**Q: Do I need to create an account?**

A: No. All calculations happen in your browser. Nothing is stored or tracked.

**Q: Does this work on mobile?**

A: Yes, the calculator is fully responsive and works on all devices.

### Pricing Questions

**Q: When was pricing data last updated?**

A: Check the footer of the calculator page for the "Last Updated" date. We update pricing monthly.

**Q: Do prices include taxes?**

A: No. Prices shown are base provider rates before any applicable taxes.

**Q: What about spot or preemptible pricing?**

A: MVP shows on-demand pricing only. Spot pricing will be added in a future version.

### Technical Questions

**Q: What if my model doesn't fit in memory?**

A: The calculator recommends GPUs with sufficient memory. If none are available, consider:
- Model parallelism (split across GPUs)
- Quantization (reduce model precision)
- Gradient checkpointing (trade compute for memory)

**Q: How are training hours calculated?**

A: Using industry-standard formulas:
```
training_flops = 6 × model_params × dataset_tokens × epochs
hours = training_flops / (gpu_tflops × utilization × num_gpus × 3600)
```

**Q: Why is egress so expensive?**

A: Cloud providers charge for data leaving their network. For high-volume inference, egress can be significant. Consider:
- Using providers with generous egress allowances
- Caching responses
- Compressing output data

---

## Troubleshooting

### Common Issues

**Issue: "No providers available" message**

**Cause**: Your configuration exceeds what providers can support.

**Solution**:
- Reduce model size
- Decrease GPU count
- Try different GPU types
- Split into multiple smaller jobs

---

**Issue: Results seem too low**

**Cause**: Calculator shows minimum viable configuration.

**Solution**:
- Add redundancy for production (multiply by 1.5-2x)
- Include overhead for failed jobs and retries
- Account for development/testing time

---

**Issue: Results seem too high**

**Cause**: You may be over-provisioning.

**Solution**:
- Try smaller GPU types
- Reduce checkpoint frequency
- Use fewer epochs
- Consider spot pricing (when available)

---

**Issue: Calculator loads slowly**

**Cause**: Large pricing database or slow connection.

**Solution**:
- Wait for initial load (one-time)
- Check your internet connection
- Try a different browser
- Clear browser cache and reload

---

**Issue: Calculation button doesn't respond**

**Cause**: Validation errors in your inputs.

**Solution**:
- Check for red error messages
- Ensure all required fields are filled
- Verify numbers are positive
- Try refreshing the page

### Getting Help

**Found a bug?**
- Open an issue on our GitHub repository
- Include: browser, OS, steps to reproduce

**Have a question?**
- Check this manual first
- Visit our FAQ section
- Join our community Discord

**Want a feature?**
- Submit a feature request on GitHub
- Explain your use case and why it matters

---

## Tips and Best Practices

### For Accurate Estimates

1. **Be Realistic** - Use actual model sizes and datasets, not theoretical maximums
2. **Include Overhead** - Add 10-20% buffer for failed jobs and debugging
3. **Consider Growth** - Plan for 2-3x your initial traffic for inference
4. **Test Small** - Run pilot experiments before committing to large providers
5. **Monitor Actual Costs** - Track real expenses and adjust estimates

### Cost Optimization Strategies

**Training**
- Use checkpointing to recover from failures
- Start with smaller models and scale up
- Consider multi-GPU only when necessary
- Clean up datasets to reduce storage costs

**Inference**
- Batch requests aggressively
- Cache common responses
- Use auto-scaling to match demand
- Compress model outputs

**Storage**
- Delete old checkpoints regularly
- Use lifecycle policies to archive data
- Compress datasets when possible
- Share datasets across projects

### When to Re-Calculate

Recalculate estimates when:
- Model size changes significantly (>2x)
- Traffic patterns shift (>50%)
- You switch frameworks or approaches
- Provider pricing changes
- New GPU types become available

---

**End of User Manual**

Need help? Visit our documentation site or open an issue on GitHub.
