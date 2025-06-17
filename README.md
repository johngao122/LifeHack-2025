# Introduction

EcoLens is a browser extension that analyzes the environmental impact and sustainability of food products and make suggestions for alternate products. 

It operates in two modes:
1. Automatic detection - Scans food shopping websites as you browse to identify products using structured data (JSON-LD), meta tags, and DOM analysis
2. Manual search - Search any food product through the popup to generate sustainability reports


### Tech Stack

EcoLens is built on React 19 + Typescript, Vite, Chrome Extensions Manifest V3 for the frontend, and {} for the backend

It uses the OpenFoodFacts API and database for the relevant sustainability data. Central foundation food data from the U.S. Department of Agriculture's (USDA) FoodData Central system is also used to recognize and index food items for algorithimic use.

The latest version of the extension can be found in the releases

[![Latest Release](https://img.shields.io/github/v/release/johngao122/LifeHack-2025)](https://github.com/johngao122/LifeHack-2025/releases/latest)

---
# Instructions for running the project locally

### Frontend

There are 2 ways to run the frontend.

### Method 1: Install Release Extension (CRX)

**Quick setup using the compiled extension file:**

1. **Download the CRX file** from releases

2. **Install in Chrome**
   - Open Chrome and go to `chrome://extensions/`
  
![image](https://github.com/user-attachments/assets/47bd6459-0186-4d7c-9263-3747b53a833f)

   - Enable "Developer mode" (toggle in top right)
  
![Screenshot 2025-06-18 at 2 47 42 AM](https://github.com/user-attachments/assets/6198e2f6-0b06-4859-aa1c-2aea95b6f64b)

   - Drag and drop the `dist.crx` file into the extensions page
   - Click "Add extension" when prompted

![image](https://github.com/user-attachments/assets/749b47b6-54bf-4ae6-8956-2a030a027586)


4. **Start using**
   - Extension icon should appear in toolbar immediately

![image](https://github.com/user-attachments/assets/7cbeec41-d105-40b0-8dc5-ccc9a9b4073d)

   - If it does not appear, you might need to pin the extension in the extensions tab


### Method 2: Build from Source (Development)

**Build and load the unpacked extension:**

1. **Setup environment**
   ```bash
   cd frontend/EcoLens
   npm install
   ```

2. **Configure API endpoint**
   ```bash
   # Create .env file
   echo "VITE_API_BASE_URL=(insert your backend api link here)" > .env
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist/` folder

5. **Development workflow**
   ```bash
   # Make changes, then rebuild
   npm run build
   # Click refresh icon in chrome://extensions/ for your extension
   ```

---

Backend


---

# How To Use

### Manual Searching

The first way to use this extension is **manual searching**. To manually search,

1. Click the extension icon

![image](https://github.com/user-attachments/assets/7237a326-1b76-4a2e-a074-78b808022dfb)

2. A window will appear, if this is the first time launching, there will be a tutorial. Otherwise it will appear as normal

![image](https://github.com/user-attachments/assets/0bf73dfe-4605-40c3-a73d-5b86812a0034)

![image](https://github.com/user-attachments/assets/29d8ad0c-e4cf-4d4e-bfaf-1eed1be1deaf)

3. Type in a product that you want to search and click the "Analyze Sustainability" button

![image](https://github.com/user-attachments/assets/25c01172-06d3-410d-9848-c88839677d31)

4. Wait for the extension to do its thing (it may take a while)

![image](https://github.com/user-attachments/assets/eec6eaf7-119c-49de-9180-def5545fe4a8)

5. After the extension is done, it will open a new tab with a sustainability report, where the user can read through the details and get reccomended alternatives.

![image](https://github.com/user-attachments/assets/8d165a89-6066-473c-aa91-abf852159490)

### Auto Pop Ups

The second way to use this extension is throught the **auto popup** feature. This feature **can be turned on and off**.

1. Turn on the auto popup feature in the main window

![image](https://github.com/user-attachments/assets/0c33257a-127c-4c21-9a9a-157d16d6bd01)

2. Browse for products. For demonstration, lets say I want to buy bread from NTUC. The extension will detect whether its a valid item and show a pop up if it thinks its a valid item.
   
![image](https://github.com/user-attachments/assets/7c5b3ffb-e229-4e99-a1af-ac412b2c0f25)

3. Click on the popup if it is a valid item. The extension will attempt to extract the name of the product automatically and ask for your confirmation

![image](https://github.com/user-attachments/assets/1b7b92a8-2cca-4f82-9b95-389a7f2989c5)

If the item detected is **inaccurate**, you can press the the edit button to edit the product name

![image](https://github.com/user-attachments/assets/60d0deb9-792d-44e5-ba5c-0ea3cb1b5486)

After confirming the correct product name, go ahead and click the continue button.

4. After continuing, you will see a little toast at the top right of the screen

![image](https://github.com/user-attachments/assets/301abb0c-ff2c-4e68-aff9-3fa8d4e24daa)

Wait patiently for the extension to do its thing

5. After the extension finishes its job, it opens a new tab and displays the sustainability report.

![image](https://github.com/user-attachments/assets/4143e78d-2eca-42df-b3b3-7389f77560c4)

---














