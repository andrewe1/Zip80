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
                <button class="widget-popout-close" title="Close">✕</button>
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
                        <button class="calc-btn calc-btn-eq" data-action="equal">=</button>
                        
                        <button class="calc-btn calc-btn-num" style="grid-column: span 2;" data-val="0">0</button>
                        <button class="calc-btn calc-btn-num" data-val=".">.</button>
                    </div>
                </div>
            </div>
        `;

        // Event Listeners
        const closeBtn = popoutWindow.querySelector('.widget-popout-close');
        closeBtn.addEventListener('click', close);

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

    function updateScreen() {
        if (display) display.textContent = currentInput;
        if (formulaDisplay) {
            formulaDisplay.textContent = operator ? `${previousInput} ${getOpSymbol(operator)}` : '';
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
