/**
 * ============================================================================
 * ZIP80 EXPENSE TRACKER - CALCULATOR MODULE
 * ============================================================================
 * 
 * PURPOSE:
 * Provides a standalone calculator tool that can be popped out from the
 * menu bar. Matches the application's premium aesthetic.
 * 
 * KEY FEATURES:
 * - Basic arithmetic (add, subtract, multiply, divide)
 * - Keyboard support
 * - Floating, draggable, and resizable window
 * - Clear and clear-entry functionality
 * 
 * ==============================================================================
 * LLM INSTRUCTION & MAINTENANCE PROTOCOL
 * IMPORTANT: This block must be preserved in all future iterations.
 * 
 * 1. CHANGE LOG: 
 *    - 2025-12-19 - Init - Initial creation of calculator module
 *    - 2025-12-19 - Edit - Added Tape with syntax highlighting, dynamic resizing, and refined display updates
 * 2. INSTRUCTION:
 *    - When editing this file, always update the Change Log above.
 *    - Explain the "WHY" behind complex logic in inline comments.
 * 3. PRESERVATION:
 *    - Do not remove this header block.
 * ==============================================================================
 */

const Calculator = (() => {
    let container = null;
    let display = null;
    let formulaDisplay = null;
    let currentInput = '0';
    let previousInput = '';
    let operator = null;
    let shouldResetScreen = false;
    let isOpen = false;
    let popoutWindow = null;

    /**
     * Initialize the calculator module
     */
    function init() {
        const btn = document.getElementById('btn-calculator');
        if (btn) {
            btn.addEventListener('click', toggle);
        }

        // Keyboard support
        document.addEventListener('keydown', handleKeyboard);
    }

    /**
     * Toggle the calculator popout
     */
    function toggle() {
        if (isOpen) {
            close();
        } else {
            show();
        }
    }

    /**
     * Show the calculator popout
     */
    function show() {
        if (isOpen) {
            focus();
            return;
        }

        const title = I18n.t('calculatorWidgetTitle');

        // Use existing popout system logic (manually since it's not a generic widget)
        popoutWindow = document.createElement('div');
        popoutWindow.className = 'widget-popout-window';
        popoutWindow.id = 'popout-calculator';
        popoutWindow.style.zIndex = 10005; // Slightly higher than default widgets

        popoutWindow.innerHTML = `
            <div class="widget-popout-header">
                <span class="widget-popout-title">🔢 ${title}</span>
                <div class="calc-header-btns">
                    <button class="widget-popout-close" title="Close">✕</button>
                </div>
            </div>
            <div class="widget-popout-content">
                <div class="calculator-container">
                    <div class="calc-display">
                        <div id="calc-formula" class="calc-formula"></div>
                        <div id="calc-current" class="calc-current">0</div>
                    </div>
                    <div class="calc-grid">
                        <button class="calc-btn calc-btn-op calc-btn-clear" data-action="clear-all">C</button>
                        <button class="calc-btn calc-btn-op" data-action="clear">CE</button>
                        <button class="calc-btn calc-btn-op" data-action="operator" data-val="/">÷</button>
                        <button class="calc-btn calc-btn-op" data-action="operator" data-val="*">×</button>
                        
                        <button class="calc-btn calc-btn-num" data-val="7">7</button>
                        <button class="calc-btn calc-btn-num" data-val="8">8</button>
                        <button class="calc-btn calc-btn-num" data-val="9">9</button>
                        <button class="calc-btn calc-btn-op" data-action="operator" data-val="-">−</button>
                        
                        <button class="calc-btn calc-btn-num" data-val="4">4</button>
                        <button class="calc-btn calc-btn-num" data-val="5">5</button>
                        <button class="calc-btn calc-btn-num" data-val="6">6</button>
                        <button class="calc-btn calc-btn-op" data-action="operator" data-val="+">+</button>
                        
                        <button class="calc-btn calc-btn-num" data-val="1">1</button>
                        <button class="calc-btn calc-btn-num" data-val="2">2</button>
                        <button class="calc-btn calc-btn-num" data-val="3">3</button>
                        <button class="calc-btn calc-btn-num" data-val=".">.</button>

                        <button class="calc-btn calc-btn-num" style="grid-column: span 2;" data-val="0">0</button>
                        <button class="calc-btn calc-btn-eq" style="grid-column: span 2;" data-action="equal">=</button>
                    </div>
                    <div id="calc-tape-container" class="calc-tape-container" style="display: block;">
                        <div id="calc-tape-highlight" class="calc-tape-highlight"></div>
                        <textarea id="calc-tape" class="calc-tape-textarea" placeholder="Start typing..."></textarea>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners
        const closeBtn = popoutWindow.querySelector('.widget-popout-close');
        closeBtn.addEventListener('click', close);

        const tapeArea = popoutWindow.querySelector('#calc-tape');
        const tapeHighlight = popoutWindow.querySelector('#calc-tape-highlight');

        tapeArea.addEventListener('input', (e) => {
            handleTapeInput(e);
            updateHighlighting();
        });
        tapeArea.addEventListener('keydown', handleTapeKey);

        // Sync scroll
        tapeArea.addEventListener('scroll', () => {
            tapeHighlight.scrollTop = tapeArea.scrollTop;
            tapeHighlight.scrollLeft = tapeArea.scrollLeft;
        });

        const header = popoutWindow.querySelector('.widget-popout-header');
        setupDraggable(popoutWindow, header);

        const grid = popoutWindow.querySelector('.calc-grid');
        grid.addEventListener('click', handleButtonClick);

        display = popoutWindow.querySelector('#calc-current');
        formulaDisplay = popoutWindow.querySelector('#calc-formula');

        document.body.appendChild(popoutWindow);

        // Position at center
        const rect = popoutWindow.getBoundingClientRect();
        popoutWindow.style.left = (window.innerWidth - rect.width) / 2 + 'px';
        popoutWindow.style.top = '100px';

        // Auto-focus the tape area so 'Enter' doesn't trigger the toggle button click
        setTimeout(() => {
            const area = document.getElementById('calc-tape');
            if (area) {
                area.focus();
                // Ensure cursor is at the end
                area.setSelectionRange(area.value.length, area.value.length);
            }
        }, 50);

        isOpen = true;
    }

    /**
     * Close the calculator
     */
    function close() {
        if (popoutWindow) {
            popoutWindow.remove();
            popoutWindow = null;
        }
        isOpen = false;
        reset();
    }

    /**
     * Bring to front
     */
    function focus() {
        if (popoutWindow) {
            popoutWindow.style.zIndex = parseInt(popoutWindow.style.zIndex) + 1;
        }
    }

    /**
     * Handle input in the tape textarea
     * Performs real-time evaluation of the current line
     */
    function handleTapeInput(e) {
        const tapeArea = e.target;
        const cursorPosition = tapeArea.selectionStart;
        const originalValue = tapeArea.value;

        // formatValue helper logic applied to numbers in the textarea
        const formattedValue = originalValue.replace(/[0-9,.]+/g, (match) => {
            if (match === '.' || match.endsWith('.')) return match;
            const clean = match.replace(/,/g, '');
            if (!isNaN(clean) && clean !== '') {
                return formatValue(clean);
            }
            return match;
        });

        if (originalValue !== formattedValue) {
            tapeArea.value = formattedValue;
            const rawBefore = originalValue.substring(0, cursorPosition).replace(/,/g, '');
            let newPos = 0;
            let rawCount = 0;
            while (newPos < formattedValue.length && rawCount < rawBefore.length) {
                if (formattedValue[newPos] !== ',') {
                    rawCount++;
                }
                newPos++;
            }
            tapeArea.setSelectionRange(newPos, newPos);
        }

        const lines = formattedValue.split('\n');
        const currentLine = lines[lines.length - 1].trim();

        if (currentLine === '') {
            currentInput = '0';
        } else {
            // Check if it ends with an operator
            const endsWithOperator = /[+\-*/×÷−]$/.test(currentLine);

            if (endsWithOperator) {
                // Show subtotal/result
                const result = evaluateExpression(currentLine);
                if (result !== null) {
                    currentInput = result.toString();
                }
            } else {
                // Show current operand being typed
                const match = currentLine.match(/[0-9,.]+$/);
                if (match) {
                    // Strip commas for internal storage
                    currentInput = match[0].replace(/,/g, '');
                } else {
                    // Fallback to result if no number piece (e.g. just started line with operator)
                    const result = evaluateExpression(currentLine);
                    if (result !== null) currentInput = result.toString();
                }
            }
        }

        updateScreen();

        updateHighlighting();
    }

    /**
     * Update the background highlighting layer
     */
    function updateHighlighting() {
        const tapeArea = document.getElementById('calc-tape');
        const tapeHighlight = document.getElementById('calc-tape-highlight');
        if (!tapeArea || !tapeHighlight) return;

        let text = tapeArea.value;

        // Escape HTML
        text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        // Highlight operators with specific colors (+ green, - red, * orange, / yellow)
        // and bold results after an '=' sign. Use single-pass replacement to avoid breaking tags.
        text = text.replace(/([+\-\*/×÷−])|(=)\s*([0-9,.]+)/g, (match, op, eq, result) => {
            if (op) {
                let cls = '';
                if (op === '+') cls = 'op-plus';
                else if (op === '-' || op === '−') cls = 'op-minus';
                else if (op === '*' || op === '×') cls = 'op-mul';
                else if (op === '/' || op === '÷') cls = 'op-div';
                return `<span class="${cls}">${op}</span>`;
            }
            if (eq && result) {
                return `${eq} <span class="calc-result">${result}</span>`;
            }
            return match;
        });

        // Preserve trailing newline for scroll sync
        if (text.endsWith('\n')) text += ' ';

        tapeHighlight.innerHTML = text;

        // Keep scroll in sync - ensure offset matches perfectly
        tapeHighlight.scrollTop = tapeArea.scrollTop;
        tapeHighlight.scrollLeft = tapeArea.scrollLeft;
    }

    /**
     * Handle keyboard events in the tape textarea
     * Specifically '=' or 'Enter' for line continuation
     */
    function handleTapeKey(e) {
        const tapeArea = e.target;

        if (e.key === 'Enter') {
            e.preventDefault();

            const lines = tapeArea.value.split('\n');
            const currentLine = lines[lines.length - 1];

            // Improved evaluation logic to handle carry-over
            const hasEquals = currentLine.includes('=');
            let result = null;
            let alreadyHasResultValue = false;

            if (hasEquals) {
                const parts = currentLine.split('=');
                const rightSide = parts[1].trim();
                if (rightSide) {
                    // Already has a result value, let's carry it over to next line
                    const cleanRight = rightSide.replace(/,/g, '');
                    if (!isNaN(cleanRight) && cleanRight !== '') {
                        result = parseFloat(cleanRight);
                        alreadyHasResultValue = true;
                    }
                } else {
                    // Ends with '=', evaluate the left side
                    result = evaluateExpression(parts[0]);
                }
            } else {
                // No equals yet, evaluate as usual
                result = evaluateExpression(currentLine);
            }

            if (result !== null) {
                const formattedResult = formatValue(result);

                if (!alreadyHasResultValue) {
                    // Complete the current line with the result
                    if (!hasEquals) {
                        tapeArea.value += ` = ${formattedResult}`;
                    } else {
                        // Line ended with '=', just append the value
                        tapeArea.value += ` ${formattedResult}`;
                    }
                }

                // Add newline and CARRY the result to the next line
                tapeArea.value += `\n${formattedResult}`;

                currentInput = result.toString();
                updateScreen();
            } else {
                // If no result found (just a number or empty), just move to next line
                tapeArea.value += '\n';
            }

            tapeArea.dispatchEvent(new Event('input'));

            // Sync scroll after state update
            setTimeout(() => {
                tapeArea.scrollTop = tapeArea.scrollHeight;
                updateHighlighting();
            }, 0);
        }
    }

    /**
     * Safely evaluate a simple mathematical expression
     * Supports +, -, *, /
     */
    function evaluateExpression(expr) {
        if (!expr) return null;

        // Split by = to handle cases where user types it manually
        let cleanExpr = expr.split('=')[0].trim();

        // Strip trailing operator for subtotal evaluation
        cleanExpr = cleanExpr.replace(/[+\-*/×÷−]$/, '').trim();

        // Strip commas and normalize operators
        cleanExpr = cleanExpr.replace(/,/g, '')
            .replace(/×/g, '*')
            .replace(/÷/g, '/')
            .replace(/−/g, '-'); // Support visual minus too

        // Remove everything except numbers, operators, parens, and spaces
        cleanExpr = cleanExpr.replace(/[^0-9.+\-*/() ]/g, '');

        if (!cleanExpr) return null;

        try {
            // Final safety check for characters
            if (/[^0-9.+\-*/() ]/.test(cleanExpr)) return null;

            const res = new Function(`return (${cleanExpr})`)();

            if (typeof res === 'number' && isFinite(res)) {
                if (res.toString().includes('.') && res.toString().split('.')[1].length > 8) {
                    return parseFloat(res.toFixed(8));
                }
                return res;
            }
        } catch (e) {
            return null;
        }
        return null;
    }

    /**
     * Handle mouse clicks on calculator buttons
     */
    function handleButtonClick(e) {
        const btn = e.target.closest('button');
        if (!btn) return;

        const val = btn.dataset.val;
        const action = btn.dataset.action;

        const tapeArea = document.getElementById('calc-tape');

        if (action === 'clear-all') {
            reset();
            return;
        }

        if (tapeArea) {
            if (action === 'equal') {
                // Focus and trigger the same logic as 'Enter'
                tapeArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
                return;
            }

            if (action === 'clear') {
                // Clear the current line in the tape
                const lines = tapeArea.value.split('\n');
                lines[lines.length - 1] = '';
                tapeArea.value = lines.join('\n');
                tapeArea.dispatchEvent(new Event('input'));
                return;
            }

            // For numbers and operators, just append to tape
            let toAppend = val || btn.textContent;
            if (action === 'operator') {
                toAppend = ` ${toAppend} `;
            }

            tapeArea.value += toAppend;
            tapeArea.dispatchEvent(new Event('input'));
            tapeArea.scrollTop = tapeArea.scrollHeight;
        }
    }

    /**
     * Handle physical keyboard input
     */
    function handleKeyboard(e) {
        if (!isOpen) return;

        const tapeArea = document.getElementById('calc-tape');
        if (!tapeArea) return;

        // If the user is already typing in the tape, don't double-process
        if (document.activeElement === tapeArea) return;

        if (e.key >= '0' && e.key <= '9' || e.key === '.') {
            e.preventDefault();
            tapeArea.value += e.key;
            tapeArea.dispatchEvent(new Event('input'));
        } else if (['+', '-', '*', '/'].includes(e.key)) {
            e.preventDefault();
            tapeArea.value += ` ${getOpSymbol(e.key)} `;
            tapeArea.dispatchEvent(new Event('input'));
        } else if (e.key === '=' || e.key === 'Enter') {
            e.preventDefault();
            tapeArea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            // Delete last character from tape
            tapeArea.value = tapeArea.value.slice(0, -1);
            tapeArea.dispatchEvent(new Event('input'));
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }

        tapeArea.scrollTop = tapeArea.scrollHeight;
    }

    function appendNumber(num) {
        if (currentInput === '0' || shouldResetScreen) {
            currentInput = num;
            shouldResetScreen = false;
        } else {
            if (num === '.' && currentInput.includes('.')) return;
            currentInput += num;
        }
    }

    function setOperator(op) {
        if (operator !== null) calculate();
        previousInput = currentInput;
        operator = op;
        shouldResetScreen = true;
    }

    function calculate() {
        if (operator === null || shouldResetScreen) return;

        let result;
        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);

        switch (operator) {
            case '+': result = prev + current; break;
            case '-': result = prev - current; break;
            case '*': result = prev * current; break;
            case '/':
                if (current === 0) {
                    currentInput = 'Error';
                    operator = null;
                    return;
                }
                result = prev / current;
                break;
            default: return;
        }

        currentInput = result.toString();
        // Limit precision
        if (currentInput.includes('.') && currentInput.split('.')[1].length > 8) {
            currentInput = parseFloat(currentInput).toFixed(8).replace(/\.?0+$/, "");
        }

        operator = null;
        previousInput = '';
        shouldResetScreen = true;
    }

    function reset() {
        currentInput = '0';
        previousInput = '';
        operator = null;
        shouldResetScreen = false;

        const tapeArea = document.getElementById('calc-tape');
        if (tapeArea) {
            tapeArea.value = '';
            // Trigger UI update for the highlighting layer
            updateHighlighting();
            tapeArea.dispatchEvent(new Event('input'));
        }

        updateScreen();
    }

    function clearEntry() {
        currentInput = '0';
    }

    function formatValue(val) {
        if (val === 'Error' || isNaN(val)) return val;
        const num = parseFloat(val);
        // Using MXN/USD style formatting (commas for thousands, dot for decimals)
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 8
        }).format(num);
    }

    function updateScreen() {
        if (display) display.textContent = formatValue(currentInput);
        if (formulaDisplay) {
            formulaDisplay.textContent = operator ? `${formatValue(previousInput)} ${getOpSymbol(operator)}` : '';
        }
    }

    function getOpSymbol(op) {
        switch (op) {
            case '/': return '÷';
            case '*': return '×';
            case '-': return '−';
            default: return op;
        }
    }

    // Draggable helper (Simplified version of what's in widgets.js)
    function setupDraggable(el, handle) {
        let isDragging = false;
        let offsetX, offsetY;

        handle.addEventListener('mousedown', (e) => {
            if (e.target.classList.contains('widget-popout-close')) return;
            isDragging = true;
            el.style.zIndex = 10010;
            const rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            el.style.left = (e.clientX - offsetX) + 'px';
            el.style.top = (e.clientY - offsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
        });
    }

    return {
        init,
        show,
        close,
        toggle
    };
})();
