# Serial Command Interface

A web-based UI for sending serial commands to IoT detectors with address selection capabilities.

## Features

- **Address Selection**: Select multiple IoT detector addresses (0x0 to 0xF) with easy multi-select interface
- **Command Management**: Load commands from JSON or text files with hexadecimal notation
- **Serial Communication**: Connect to serial ports using Web Serial API
- **Response Handling**: Automatic 50ms delay for response capture with proper formatting
- **Command Types**: Support for addressable and non-addressable commands
- **Response Types**: Handle binary data, text responses, and no-response commands

## File Structure

```
serial-command-ui/
├── index.html          # Main UI interface
├── script.js           # JavaScript functionality
├── commands.json       # Sample command definitions
└── README.md          # This documentation
```

## Command File Format

### JSON Format
```json
[
  {
    "name": "Command Name",
    "hexBytes": [1, 35, 0, 255],
    "type": "addressable|none",
    "responseType": "binary|text|none",
    "addressByte": 2
  }
]
```

### Text Format
```
CommandName 0x01,0x23,0x00,0xFF addressable binary 2
```

**Fields:**
- `name`: Human-readable command name
- `hexBytes`: Array of decimal byte values (0-255)
- `type`: "addressable" for commands with address field, "none" for global commands
- `responseType`: "binary" for binary responses, "text" for readable text, "none" for no response
- `addressByte`: (optional) Index of byte containing address nibble (0-based)

## Address Handling

For addressable commands:
- Address is injected into the lower nibble of the specified byte
- Address range: 0x0 to 0xF (0-15 decimal)
- Multiple addresses can be selected - command sent to each selected address
- Address injection formula: `byte = (byte & 0xF0) | (address & 0x0F)`

## Usage Instructions

1. **Open the Web Interface**: Open `index.html` in a compatible browser (Chrome/Edge recommended)
2. **Connect to Serial Port**: Click "Connect" and select your serial device
3. **Load Commands**: Click "Load Commands" and select a command file (JSON or text format)
4. **Select Addresses**: Choose target addresses for addressable commands using the grid
5. **Send Commands**: Click "Send" next to any command to execute it

## Browser Compatibility

- **Chrome/Edge**: Full Web Serial API support
- **Firefox**: Limited support (may require flags)
- **Safari**: No Web Serial API support

## Serial Connection Settings

- **Baud Rates**: 9600, 19200, 38400, 57600, 115200 (default)
- **Data Format**: 8 data bits, no parity, 1 stop bit
- **Flow Control**: None

## Response Handling

- **Binary Responses**: Displayed as hexadecimal byte sequences
- **Text Responses**: Displayed as decoded UTF-8 text
- **No Response**: Command sent without waiting for response
- **50ms Delay**: Automatic delay after command send before reading response

## Sample Commands

The included `commands.json` contains example commands:

- **Read Temperature**: Addressable, returns text
- **Get Device ID**: Addressable, returns binary
- **System Status**: Global command, returns binary
- **Reset Device**: Addressable, no response

## Troubleshooting

### Connection Issues
- Ensure browser supports Web Serial API
- Check that serial device is properly connected
- Verify correct COM port and baud rate

### Command Issues
- Validate command file format
- Check hex byte values (0-255 range)
- Verify address byte index for addressable commands

### Response Issues
- Some commands may not return responses immediately
- Check device documentation for expected response timing
- Verify responseType matches actual device response

## Security Considerations

- Web Serial API requires user permission for each connection
- Only connect to trusted serial devices
- Command files should be from trusted sources

## Development

To modify or extend the interface:

1. **Add New Command Types**: Modify `script.js` command handling logic
2. **Custom UI**: Update `index.html` and add CSS styles
3. **New Response Formats**: Extend `displayResponse()` method in `script.js`

## License

This project is provided as-is for educational and development purposes.
