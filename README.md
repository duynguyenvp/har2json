# HAR to Mockoon Converter

This tool helps you **convert HAR (HTTP Archive) files** into a [Mockoon](https://mockoon.com/) configuration file, allowing you to mock APIs from real request/response data.

## 📂 Project Structure

```
├── convert.bat          # Batch script to run the converter
├── har2mockoon.js       # Main script for HAR → Mockoon conversion
├── input/               # Folder containing HAR files to convert
├── output/              # Output folder for generated files
│   └── mockoon.json     # Generated Mockoon configuration
├── setup.bat            # Batch script to install dependencies
├── node_modules/        # Node.js dependencies
└── README.md            # Documentation
```

## 🚀 Usage

### 1. Setup
Run the setup script to install dependencies (only needed once):
```bash
setup.bat
```

### 2. Convert HAR Files
1. Place your `.har` files in the `input/` folder
2. Run the converter:
   ```bash
   convert.bat
   ```
3. The tool will:
   - Process all `.har` files in the `input/` folder
   - Convert them to Mockoon format
   - Merge new APIs into `output/mockoon.json`
   - **Delete the processed HAR files** from the `input/` folder

👉 Result: generates `output/mockoon.json`, which can be imported into Mockoon.

### 3. Add More APIs
To add more APIs:
1. Place new `.har` files in the `input/` folder
2. Run `convert.bat` again
3. New APIs will be merged into the existing `mockoon.json`

> ⚠️ **Important**: The tool automatically deletes HAR files after processing them. Make sure to backup your HAR files if needed.

> 💡 **Smart Merging**: The tool automatically detects duplicate APIs and only adds new ones, preserving your existing configuration.

### 4. Use with Mockoon
- Open **Mockoon app** or use **Mockoon CLI**
- Import `output/mockoon.json`
- Start your mock server and test the APIs

## 📌 Notes
- HAR files can be exported directly from **Chrome DevTools** or proxy tools like **Fiddler**, **Charles**, or **Postman**
- The tool processes all `.har` files in the `input/` folder at once
- Each HAR file is processed and then deleted to avoid reprocessing
- To reset everything, delete `output/mockoon.json` and run the conversion again
- The tool automatically handles different HTTP methods, status codes, and response types
