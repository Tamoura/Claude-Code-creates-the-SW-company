import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import QuantumSovereigntyArab from './QuantumSovereigntyArab';
import i18n from '../i18n/i18n';

describe('QuantumSovereigntyArab', () => {
  beforeEach(() => {
    // Reset to English before each test
    i18n.changeLanguage('en');
  });

  it('renders the page title', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );
    expect(screen.getByText(/Quantum Sovereignty in the Arab World/i)).toBeInTheDocument();
  });

  it('renders all six main sections', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // Section 1: Overview
    expect(screen.getByText(/Why Quantum Sovereignty Matters/i)).toBeInTheDocument();

    // Section 2: Current State
    expect(screen.getByText(/Current State in Arab Nations/i)).toBeInTheDocument();

    // Section 3: Key Investment Areas
    expect(screen.getByText(/Key Investment Areas/i)).toBeInTheDocument();

    // Section 4: Strategic Use Cases
    expect(screen.getByText(/Strategic Use Cases for Arab World/i)).toBeInTheDocument();

    // Section 5: Challenges & Opportunities
    expect(screen.getByText(/Challenges & Opportunities/i)).toBeInTheDocument();

    // Section 6: Roadmap
    expect(screen.getByText(/Roadmap for Regional Leadership/i)).toBeInTheDocument();
  });

  it('renders country-specific information', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // Check for specific countries mentioned - use getAllByText since they appear in multiple places
    expect(screen.getAllByText(/United Arab Emirates/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Saudi Arabia/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Egypt/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Qatar/i).length).toBeGreaterThan(0);
  });

  it('renders investment areas with icons', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // These are specific headings in the investments section
    expect(screen.getByRole('heading', { name: /Quantum Infrastructure/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Quantum Cryptography/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Quantum Sensors/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Education & Talent/i })).toBeInTheDocument();
  });

  it('renders strategic use cases', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    expect(screen.getByText(/Oil & Gas Optimization/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Services & Islamic Banking/i)).toBeInTheDocument();
    expect(screen.getByText(/Smart City Infrastructure/i)).toBeInTheDocument();
  });

  it('renders roadmap with three timeframes', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    expect(screen.getByText(/Near-Term \(1-3 Years\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Medium-Term \(3-5 Years\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Long-Term \(5-10 Years\)/i)).toBeInTheDocument();
  });

  it('renders call to action section', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    expect(screen.getByText(/The Time to Act is Now/i)).toBeInTheDocument();
  });

  it('switches to Arabic when language changes', async () => {
    const { rerender } = render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // Change to Arabic
    await i18n.changeLanguage('ar');

    rerender(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // Check for Arabic title
    expect(screen.getByText(/السيادة الكمومية في العالم العربي/i)).toBeInTheDocument();
  });

  it('renders references section with citations', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // Check References section exists
    expect(screen.getByRole('heading', { name: /References/i })).toBeInTheDocument();

    // Check that some key references are present (using getAllByText since they appear multiple times)
    expect(screen.getAllByText(/National Institute of Standards and Technology/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Technology Innovation Institute/i).length).toBeGreaterThan(0);

    // Check that reference links are present and open in new tab
    const referenceLinks = screen.getAllByRole('link').filter(link =>
      link.getAttribute('target') === '_blank' &&
      link.getAttribute('rel') === 'noopener noreferrer'
    );
    expect(referenceLinks.length).toBeGreaterThan(0);
  });

  it('contains inline citations in content', () => {
    render(
      <BrowserRouter>
        <QuantumSovereigntyArab />
      </BrowserRouter>
    );

    // Check that citation superscripts are present
    const citations = screen.getAllByText(/\[\d+\]/);
    expect(citations.length).toBeGreaterThan(0);
  });
});
