class SerialCommandInterface {
    constructor() {
        this.port = null;
        this.reader = null;
        this.writer = null;
        this.commands = [];
        this.selectedAddresses = new Set();
        
        this.initializeEventListeners();
        this.createAddressGrid();
        this.loadDefaultCommands();
    }

    initializeEventListeners() {
        // Connection buttons
        document.getElementById('connectBtn').addEventListener('click', () => this.connect());
        document.getElementById('disconnectBtn').addEventListener('click', () => this.disconnect());
        
        // Address selection buttons
        document.getElementById('selectAllBtn').addEventListener('click', () => this.selectAllAddresses());
        document.getElementById('deselectAllBtn').addEventListener('click', () => this.deselectAllAddresses());
        
        // Auto-load commands on page load
        this.loadDefaultCommands();
    }

    createAddressGrid() {
        const grid = document.getElementById('addressGrid');
        grid.innerHTML = '';
        
        for (let i = 0; i < 16; i++) {
            const hexAddr = i.toString(16).toUpperCase();
            const div = document.createElement('div');
            div.className = 'relative';
            div.innerHTML = `
                <input type="checkbox" id="addr_${i}" value="${i}" class="address-checkbox hidden">
                <label for="addr_${i}" class="address-label block border-2 border-gray-300 rounded text-center cursor-pointer hover:bg-gray-50 transition-colors">
                    <div class="font-mono font-bold">${hexAddr}</div>
                </label>
            `;
            grid.appendChild(div);
            
            // Add event listener to update selected count
            const checkbox = div.querySelector('input');
            checkbox.addEventListener('change', () => this.updateSelectedCount());
        }
    }

    updateSelectedCount() {
        const checkboxes = document.querySelectorAll('.address-checkbox:checked');
        this.selectedAddresses.clear();
        checkboxes.forEach(cb => {
            if (cb && cb.value !== undefined) {
                this.selectedAddresses.add(parseInt(cb.value));
            }
        });
        const countElement = document.getElementById('selectedCount');
        if (countElement) {
            countElement.textContent = this.selectedAddresses.size;
        }
    }

    selectAllAddresses() {
        document.querySelectorAll('.address-checkbox').forEach(cb => cb.checked = true);
        this.updateSelectedCount();
    }

    deselectAllAddresses() {
        document.querySelectorAll('.address-checkbox').forEach(cb => cb.checked = false);
        this.updateSelectedCount();
    }

    async connect() {
        try {
            if ('serial' in navigator) {
                this.port = await navigator.serial.requestPort();
                await this.port.open({ 
                    baudRate: 9600,
                    dataBits: 8,
                    stopBits: 1,
                    parity: 'even'
                });
                
                this.writer = this.port.writable.getWriter();
                this.reader = this.port.readable.getReader();
                
                this.updateConnectionStatus(true);
                this.startReading();
            } else {
                this.showResponse('Web Serial API not supported in this browser', 'error');
            }
        } catch (error) {
            this.showResponse(`Connection failed: ${error.message}`, 'error');
        }
    }

    async disconnect() {
        try {
            if (this.reader) {
                await this.reader.cancel();
                await this.reader.releaseLock();
            }
            if (this.writer) {
                await this.writer.releaseLock();
            }
            if (this.port) {
                await this.port.close();
            }
            
            this.updateConnectionStatus(false);
        } catch (error) {
            this.showResponse(`Disconnection failed: ${error.message}`, 'error');
        }
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        const connectBtn = document.getElementById('connectBtn');
        const disconnectBtn = document.getElementById('disconnectBtn');
        
        if (connected) {
            status.textContent = 'Connected';
            status.className = 'text-green-600 font-semibold';
            connectBtn.disabled = true;
            disconnectBtn.disabled = false;
        } else {
            status.textContent = 'Not connected';
            status.className = 'text-gray-600';
            connectBtn.disabled = false;
            disconnectBtn.disabled = true;
        }
    }

async startReading() {
    const decoder = new TextDecoderStream();
    this.port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    const reader = inputStream.getReader();
    
    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            if (value) {
                // Process and display the response immediately as it arrives
                this.displayResponse(
                    new TextEncoder().encode(value),
                    'Response',
                    '',
                    ''
                );
            }
        }
    } catch (error) {
        console.error('Reading error:', error);
    } finally {
        reader.releaseLock();
    }
}
    async loadDefaultCommands() {
        try {
            const response = await fetch('commands.json');
            const content = await response.text();
            this.commands = JSON.parse(content);
            this.displayCommands();
            this.showResponse(`Successfully loaded ${this.commands.length} commands`, 'success');
        } catch (error) {
            this.showResponse(`Failed to load commands: ${error.message}`, 'error');
        }
    }

    parseHexString(hexString) {
        const bytes = [];
        for (let i = 0; i < hexString.length; i += 2) {
            if (i + 1 < hexString.length) {
                bytes.push(parseInt(hexString.substr(i, 2), 16));
            }
        }
        return bytes;
    }

    displayCommands() {
        const tbody = document.getElementById('commandsList');
        tbody.innerHTML = '';
        
        // Find longest command name for button width
        const maxNameLength = Math.max(...this.commands.map(cmd => cmd.name.length));
        const buttonWidth = Math.max(maxNameLength * 8 + 20, 80); // 8px per character + padding
        
        this.commands.forEach((cmd, index) => {
            const row = document.createElement('tr');
            row.className = 'command-row';
            
            let extraValueCell = '';
            if (cmd.extraValue) {
                extraValueCell = `
                    <td class="border border-gray-300 px-4 py-2">
                        <input type="number" 
                               id="extraValue_${index}" 
                               min="${cmd.min || 0}" 
                               max="${cmd.max || 255}" 
                               class="w-20 px-2 py-1 border border-gray-300 rounded"
                               placeholder="${cmd.min || 0}-${cmd.max || 255}">
                    </td>
                `;
            } else {
                extraValueCell = '<td class="border border-gray-300 px-4 py-2">-</td>';
            }
            
            row.innerHTML = `
                <td class="border border-gray-300 px-4 py-2">
                    <button onclick="serialInterface.sendCommand(${index})" 
                            class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm transition-colors"
                            style="width: ${buttonWidth}px; min-width: ${buttonWidth}px;">
                        ${cmd.name}
                    </button>
                </td>
                <td class="border border-gray-300 px-4 py-2 font-mono">${cmd.hexBytes}</td>
                <td class="border border-gray-300 px-4 py-2">${cmd.type}</td>
                <td class="border border-gray-300 px-4 py-2">${cmd.responseType}</td>
                ${extraValueCell}
            `;
            tbody.appendChild(row);
        });
    }

    async sendCommand(commandIndex) {
        if (!this.port || !this.writer) {
            this.showResponse('Not connected to serial port', 'error');
            return;
        }
        
        const cmd = this.commands[commandIndex];
        
        if (cmd.type === 'addressable' && this.selectedAddresses.size === 0) {
            this.showResponse('Please select at least one address for addressable commands', 'error');
            return;
        }
        
        // Validate extra value if required
        let extraValue = null;
        if (cmd.extraValue) {
            const inputElement = document.getElementById(`extraValue_${commandIndex}`);
            if (!inputElement || inputElement.value === '') {
                this.showResponse('Please enter a value for this command', 'error');
                return;
            }
            
            extraValue = parseInt(inputElement.value);
            if (isNaN(extraValue) || extraValue < cmd.min || extraValue > cmd.max) {
                this.showResponse(`Value must be between ${cmd.min} and ${cmd.max}`, 'error');
                return;
            }
        }
        
        try {
            if (cmd.type === 'addressable') {
                // Send command to each selected address in a loop
                const addresses = Array.from(this.selectedAddresses);
                for (let i = 0; i < addresses.length; i++) {
                    const addr = addresses[i];
                    let commandBytes = this.parseHexString(cmd.hexBytes);
                    
                    // Inject address
                    commandBytes = this.injectAddress(commandBytes, addr, cmd.addressByte);
                    
                    // Add extra value if present
                    if (cmd.extraValue && extraValue !== null) {
                        commandBytes.push(extraValue);
                    }
                    
                    // Convert bytes to hex string for display
                    const fullCommandHex = commandBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
                    
                    // Show sending message
                    //this.showResponse(`Sending ${cmd.name} (${cmd.hexBytes}) to 0x${addr.toString(16).toUpperCase()}`, 'info');
                    
                    // Send the command
                    await this.sendBinaryCommand(commandBytes, cmd.name, `0x${addr.toString(16).toUpperCase()}`, cmd, fullCommandHex);
                    
                    // 50ms break between addresses (except for last one)
                    if (i < addresses.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }
            } else {
                // Send command without address
                let commandBytes = this.parseHexString(cmd.hexBytes);
                
                // Add extra value if present
                if (cmd.extraValue && extraValue !== null) {
                    commandBytes.push(extraValue);
                }
                
                // Convert bytes to hex string for display
                const fullCommandHex = commandBytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join('');
                
                this.showResponse(`Sending ${cmd.name} (${cmd.hexBytes})`, 'info');
                await this.sendBinaryCommand(commandBytes, cmd.name, 'N/A', cmd, fullCommandHex);
            }
        } catch (error) {
            this.showResponse(`Failed to send command: ${error.message}`, 'error');
        }
    }

    injectAddress(hexBytes, address, addressByteIndex) {
        const bytes = [...hexBytes];
        if (addressByteIndex >= 0 && addressByteIndex < bytes.length) {
            // OR the address byte with address nibble (lower 4 bits)
            bytes[addressByteIndex] = bytes[addressByteIndex] | (address & 0x0F);
        }
        return bytes;
    }

    async sendBinaryCommand(bytes, commandName, address, cmd, fullCommandHex) {
        const buffer = new Uint8Array(bytes);
        
        try {
            await this.writer.write(buffer);
            
            // Wait for response if expected
        } catch (error) {
            throw new Error(`Failed to write to serial port: ${error.message}`);
        }
    }

    displayResponse(data, commandName, address, fullCommand) {
        const cmd = this.commands.find(c => c.name === commandName);
        const responseType = cmd ? cmd.responseType : 'none';
        
        let responseHtml = '';
        const timestamp = new Date().toLocaleTimeString();
        
        if (responseType === 'binary') {
            const hexString = Array.from(data).map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
            responseHtml = `
                <div class="border border-gray-300 rounded p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold">${commandName} → ${address}</span>
                        <span class="text-sm text-gray-500">${timestamp}</span>
                    </div>
                    <div class="text-sm text-gray-600 mb-1">Command: ${fullCommand}</div>
                    <div class="response-binary">Binary: ${hexString}</div>
                </div>
            `;
        } else if (responseType === 'text') {
            const text = new TextDecoder().decode(data);
            responseHtml = `
                <div class="border border-gray-300 rounded p-3">
                    <div class="flex justify-between items-center mb-2">
                        <span class="font-semibold">${commandName} → ${address}</span>
                        <span class="text-sm text-gray-500">${timestamp}</span>
                    </div>
                    <div class="text-sm text-gray-600 mb-1">Command: ${fullCommand}</div>
                    <div class="response-text">Text: ${text}</div>
                </div>
            `;
        }
        
        if (responseHtml) {
            const container = document.getElementById('responseContainer');
            container.insertAdjacentHTML('afterbegin', responseHtml);
            
            // Keep only last 50 responses
            while (container.children.length > 50) {
                container.removeChild(container.lastChild);
            }
        }
    }

    showResponse(message, type = 'info') {
        const container = document.getElementById('responseContainer');
        const timestamp = new Date().toLocaleTimeString();
        const colorClass = type === 'error' ? 'text-red-600' : type === 'success' ? 'text-green-600' : 'text-blue-600';
        
        const html = `
            <div class="border border-gray-300 rounded p-3">
                <div class="flex justify-between items-center">
                    <span class="${colorClass}">${message}</span>
                    <span class="text-sm text-gray-500">${timestamp}</span>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('afterbegin', html);
        
        // Keep only last 50 responses
        while (container.children.length > 50) {
            container.removeChild(container.lastChild);
        }
    }
}

// Initialize the interface when the page loads
let serialInterface;
document.addEventListener('DOMContentLoaded', () => {
    serialInterface = new SerialCommandInterface();
});
