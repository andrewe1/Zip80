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
                    <button class="calc-tape-toggle" title="Show Tape">📜</button>
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
                    <div id="calc-tape-container" class="calc-tape-container">
                        <textarea id="calc-tape" class="calc-tape-textarea" placeholder="Start typing..."></textarea>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners
        const closeBtn = popoutWindow.querySelector('.widget-popout-close');
        closeBtn.addEventListener('click', close);

        const tapeToggle = popoutWindow.querySelector('.calc-tape-toggle');
        const tapeContainer = popoutWindow.querySelector('#calc-tape-container');
        const tapeArea = popoutWindow.querySelector('#calc-tape');

        tapeToggle.addEventListener('click', () => {
            const isActive = tapeContainer.style.display === 'block';
            tapeContainer.style.display = isActive ? 'none' : 'block';
            tapeToggle.classList.toggle('active', !isActive);
            if (!isActive) tapeArea.focus();
        });

        tapeArea.addEventListener('input', handleTapeInput);
        tapeArea.addEventListener('keydown', handleTapeKey);

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
            // Don't format if it's just a decimal point or ends with one (user still typing)
            if (match === '.' || match.endsWith('.')) return match;

            const clean = match.replace(/,/g, '');
            if (!isNaN(clean) && clean !== '') {
                return formatValue(clean);
            }
            return match;
        });

        if (originalValue !== formattedValue) {
            tapeArea.value = formattedValue;

            // Adjust cursor position by mapping raw character count (excluding commas)
            const rawBefore = originalValue.substring(0, cursorPosition).replace(/,/g, '');
            let newPos = 0;
            let rawCount = 0;
            while (newPos < formattedValue.length && rawCount < rawBefore.length) {
                if (formattedValue[newPos] !== ',') {
                    rawCount++;
                }
                newPos++;
            }
            // If the character just typed caused a shift, newPos will account for it
            tapeArea.setSelectionRange(newPos, newPos);
        }

        const lines = formattedValue.split('\n');
        const currentLine = lines[lines.length - 1];

        // Match expressions like 1,234 + 4,567
        const result = evaluateExpression(currentLine);
        if (result !== null) {
            currentInput = result.toString();
            updateScreen();
        }
    }

    /**
     * Handle keyboard events in the tape textarea
     * Specifically '=' or 'Enter' for line continuation
     */
    function handleTapeKey(e) {
        const tapeArea = e.target;

        if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();

            const lines = tapeArea.value.split('\n');
            const currentLine = lines[lines.length - 1];
            const result = evaluateExpression(currentLine);

            if (result !== null) {
                // Append result to current line and start new line with result
                // Use formatted result for the tape history
                const formattedResult = formatValue(result);
                tapeArea.value += ` = ${formattedResult}\n${formattedResult}`;

                // Keep result in main display
                currentInput = result.toString();
                updateScreen();

                // Scroll to bottom
                tapeArea.scrollTop = tapeArea.scrollHeight;
            }
        }
    }

    /**
     * Safely evaluate a simple mathematical expression
     * Supports +, -, *, /
     */
    function evaluateExpression(expr) {
        // Strip out commas first so we can parse numbers like 1,000.00
        const cleanExpr = expr.replace(/,/g, '').replace(/[^0-9.+\-*/]/g, '');
        if (!cleanExpr) return null;

        try {
            // Check for trailing operator - if present, evaluate up to it
            let targetExpr = cleanExpr;
            if (/[+\-*/]$/.test(cleanExpr)) {
                targetExpr = cleanExpr.slice(0, -1);
            }

            if (!targetExpr) return null;

            // Use Function for a slightly safer "eval" (still scoped but avoids leaking)
            const res = new Function(`return ${targetExpr}`)();

            if (typeof res === 'number' && isFinite(res)) {
                // Limit precision like in the main calculator
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

        if (!action || action === 'num') {
            appendNumber(val || btn.textContent);
        } else if (action === 'operator') {
            setOperator(val);
        } else if (action === 'equal') {
            calculate();
        } else if (action === 'clear-all') {
            reset();
        } else if (action === 'clear') {
            clearEntry();
        }

        updateScreen();
    }

    /**
     * Handle physical keyboard input
     */
    function handleKeyboard(e) {
        if (!isOpen) return;

        if (e.key >= '0' && e.key <= '9') appendNumber(e.key);
        if (e.key === '.') appendNumber('.');
        if (e.key === '=' || e.key === 'Enter') calculate();
        if (e.key === 'Backspace') clearEntry();
        if (e.key === 'Escape') close();
        if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            setOperator(e.key);
        }

        updateScreen();
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
