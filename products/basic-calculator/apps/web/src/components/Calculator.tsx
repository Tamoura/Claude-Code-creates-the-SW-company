import { useState, useEffect, useCallback } from 'react';
import { calculate } from '../calculators/arithmetic';
import type { Operation } from '../calculators/arithmetic';
import { formatDisplay } from '../calculators/precision';
import type { CalculatorState } from '../types/calculator';
import { Display } from './Display';
import { Button } from './Button';

/**
 * Main Calculator component
 * Manages state, handles user input, and performs calculations
 */
export function Calculator() {
  const [state, setState] = useState<CalculatorState>({
    currentValue: '0',
    previousValue: null,
    operation: null,
    shouldResetDisplay: false,
    error: null,
  });

  // Handle number button click
  const handleNumberClick = useCallback((num: string) => {
    setState((prev) => {
      // Clear error state
      if (prev.error) {
        return {
          ...prev,
          currentValue: num,
          error: null,
          shouldResetDisplay: false,
        };
      }

      // Reset display if needed
      if (prev.shouldResetDisplay) {
        return {
          ...prev,
          currentValue: num,
          shouldResetDisplay: false,
        };
      }

      // Append number to current value
      const newValue = prev.currentValue === '0' ? num : prev.currentValue + num;

      return {
        ...prev,
        currentValue: newValue,
      };
    });
  }, []);

  // Handle decimal point
  const handleDecimalClick = useCallback(() => {
    setState((prev) => {
      // Clear error state
      if (prev.error) {
        return {
          ...prev,
          currentValue: '0.',
          error: null,
          shouldResetDisplay: false,
        };
      }

      // Reset display if needed
      if (prev.shouldResetDisplay) {
        return {
          ...prev,
          currentValue: '0.',
          shouldResetDisplay: false,
        };
      }

      // Don't add decimal if already exists
      if (prev.currentValue.includes('.')) {
        return prev;
      }

      return {
        ...prev,
        currentValue: prev.currentValue + '.',
      };
    });
  }, []);

  // Handle operation button click
  const handleOperationClick = useCallback((op: Operation) => {
    setState((prev) => {
      // Clear error
      if (prev.error) {
        return {
          ...prev,
          previousValue: prev.currentValue,
          operation: op,
          shouldResetDisplay: true,
          error: null,
        };
      }

      // If there's a previous operation, calculate it first
      if (prev.operation && prev.previousValue && !prev.shouldResetDisplay) {
        try {
          const result = calculate(
            parseFloat(prev.previousValue),
            parseFloat(prev.currentValue),
            prev.operation
          );
          const formattedResult = formatDisplay(result);

          return {
            ...prev,
            currentValue: formattedResult,
            previousValue: formattedResult,
            operation: op,
            shouldResetDisplay: true,
          };
        } catch (error) {
          return {
            ...prev,
            currentValue: `Error: ${(error as Error).message}`,
            error: (error as Error).message,
            operation: null,
            previousValue: null,
            shouldResetDisplay: false,
          };
        }
      }

      return {
        ...prev,
        previousValue: prev.currentValue,
        operation: op,
        shouldResetDisplay: true,
      };
    });
  }, []);

  // Handle equals button click
  const handleEqualsClick = useCallback(() => {
    setState((prev) => {
      // Need operation and previous value to calculate
      if (!prev.operation || !prev.previousValue) {
        return prev;
      }

      // Clear error
      if (prev.error) {
        return {
          ...prev,
          error: null,
        };
      }

      try {
        const result = calculate(
          parseFloat(prev.previousValue),
          parseFloat(prev.currentValue),
          prev.operation
        );
        const formattedResult = formatDisplay(result);

        return {
          currentValue: formattedResult,
          previousValue: null,
          operation: null,
          shouldResetDisplay: true,
          error: null,
        };
      } catch (error) {
        return {
          currentValue: `Error: ${(error as Error).message}`,
          previousValue: null,
          operation: null,
          shouldResetDisplay: false,
          error: (error as Error).message,
        };
      }
    });
  }, []);

  // Handle clear button click
  const handleClearClick = useCallback(() => {
    setState({
      currentValue: '0',
      previousValue: null,
      operation: null,
      shouldResetDisplay: false,
      error: null,
    });
  }, []);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;

      // Prevent default for calculator keys
      if (/^[0-9+\-*/=.cC]$/.test(key) || key === 'Enter' || key === 'Escape') {
        event.preventDefault();
      }

      // Numbers
      if (/^[0-9]$/.test(key)) {
        handleNumberClick(key);
      }

      // Decimal
      if (key === '.') {
        handleDecimalClick();
      }

      // Operations
      if (['+', '-', '*', '/'].includes(key)) {
        handleOperationClick(key as Operation);
      }

      // Equals
      if (key === 'Enter' || key === '=') {
        handleEqualsClick();
      }

      // Clear
      if (key === 'Escape' || key.toLowerCase() === 'c') {
        handleClearClick();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberClick, handleDecimalClick, handleOperationClick, handleEqualsClick, handleClearClick]);

  return (
    <main
      role="main"
      aria-label="Basic Calculator"
      className="flex items-center justify-center min-h-screen bg-calc-bg p-4"
    >
      <div
        role="group"
        aria-label="Calculator interface"
        className="bg-gray-800 p-6 rounded-2xl shadow-2xl max-w-md w-full"
      >
        <Display value={state.currentValue} error={!!state.error} />

        <div
          role="grid"
          aria-label="Calculator buttons"
          className="grid grid-cols-4 gap-3"
        >
          {/* Row 1: 7, 8, 9, / */}
          <Button value="7" onClick={() => handleNumberClick('7')} ariaLabel="Seven" variant="number" />
          <Button value="8" onClick={() => handleNumberClick('8')} ariaLabel="Eight" variant="number" />
          <Button value="9" onClick={() => handleNumberClick('9')} ariaLabel="Nine" variant="number" />
          <Button value="÷" onClick={() => handleOperationClick('/')} ariaLabel="Divide" variant="operator" />

          {/* Row 2: 4, 5, 6, * */}
          <Button value="4" onClick={() => handleNumberClick('4')} ariaLabel="Four" variant="number" />
          <Button value="5" onClick={() => handleNumberClick('5')} ariaLabel="Five" variant="number" />
          <Button value="6" onClick={() => handleNumberClick('6')} ariaLabel="Six" variant="number" />
          <Button value="×" onClick={() => handleOperationClick('*')} ariaLabel="Multiply" variant="operator" />

          {/* Row 3: 1, 2, 3, - */}
          <Button value="1" onClick={() => handleNumberClick('1')} ariaLabel="One" variant="number" />
          <Button value="2" onClick={() => handleNumberClick('2')} ariaLabel="Two" variant="number" />
          <Button value="3" onClick={() => handleNumberClick('3')} ariaLabel="Three" variant="number" />
          <Button value="−" onClick={() => handleOperationClick('-')} ariaLabel="Minus" variant="operator" />

          {/* Row 4: 0, ., =, + */}
          <Button value="0" onClick={() => handleNumberClick('0')} ariaLabel="Zero" variant="number" />
          <Button value="." onClick={handleDecimalClick} ariaLabel="Decimal point" variant="decimal" />
          <Button value="=" onClick={handleEqualsClick} ariaLabel="Equals" variant="equals" />
          <Button value="+" onClick={() => handleOperationClick('+')} ariaLabel="Plus" variant="operator" />

          {/* Row 5: Clear (spans 4 columns) */}
          <Button
            value="C"
            onClick={handleClearClick}
            ariaLabel="Clear"
            variant="clear"
            className="col-span-4"
          />
        </div>
      </div>
    </main>
  );
}
