"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ---------------------------------------------------------------------------
// Staff-side language layer.
//
// Amharic is the default for every staff interface (the cafe team works in
// Amharic); anything not translated falls back to the English key, so a
// missing string can never render as a blank label.
// ---------------------------------------------------------------------------

export type StaffLang = "am" | "en" | "om";

const STORAGE_KEY = "staff_lang";

// Every value may carry an Amharic string; the key itself is the English text.
type Dict = Record<string, string>;

const am: Dict = {
  // ---- Shared chrome -------------------------------------------------------
  "Skill Coffee": "ስኪል ኮፊ",
  "Customer View ↗": "የደንበኛ ማውያ ኢዜአ ↗",
  Logout: "ውጣ",
  "Sign out of staff session": "ከሠራተኛ ገጽታ ውጣ",
  "Live Console": "ቀጥታ ማዕከል",
  Kitchen: "መጠብቻ",
  Bar: "ባር",
  Floor: "ገበታ",
  Cashier: "ገንዘብ ተቀባይ",
  Admin: "አስተዳዳሪ",
  "Kitchen Private Terminal": "የመጠብቻ ግሊ ማዕከል",
  "Bar Private Terminal": "የባር ግሊ ማዕከል",
  "Floor Waiter Terminal": "የገበታ ማዕከል",
  "POS Cashier Terminal": "የገንዘብ ተቀባይ ማዕከል",
  "Super Admin Master Access": "የዋና አስተዳዳሪ ሙሉ መዳሰሻ",
  "Admin Operations Mode": "የአስተዳዳሪ የሥራ ሁነታ",
  "Access Dashboard": "ወደ ዳሽቦርድ ግባ",
  "Accessing Dashboard...": "ወደ ዳሽቦርድ በመግባት ላይ...",
  Username: "የመግቢያ ስም",
  Password: "የይለፍ ቃል",
  "Enter staff username": "የሠራተኛ ስም ያስገቡ",
  "Enter password": "የይለፍ ቃል ያስገቡ",
  "Staff Portal": "የሠራተኛ መዳሰሻ",
  "Management & Service Systems": "አስተዳደር እና አገልግሎት ስርዓቶች",
  "Customer Menu": "የደንበኛ ዝርዝር",
  "Quick Sandbox Access": "ፈጣን የሙከራ መዳሰሻ",
  "Super Admin": "ዋና አስተዳዳሪ",
  "Super Admin · Master Control": "ዋና አስተዳዳሪ · ዋና ቁጥጥር",
  "Admin (Limited)": "አስተዳዳሪ (የተወሰነ)",
  "Admin · Limited Access": "አስተዳዳሪ · የተወሰነ መዳሰሻ",
  "Kitchen Staff": "የመጠብቻ ሠራተኛ",
  "Kitchen Station · Restricted": "የመጠብቻ ጣቢያ · የተከለከለ",
  "Bar / Barista": "ባር / ባሪስታ",
  "Bar Station · Restricted": "የባር ጣቢያ · የተከለከለ",
  "Floor Waiter": "የገበታ መዝጊያ",
  "Floor Waiter · Restricted": "የገበታ መዝጊያ · የተከለከለ",
  "Cashier & Billing": "ገንዘብ ተቀባይ እና ጥፊት",
  "Cashier Terminal · Restricted": "የገንዘብ ተቀባይ ማዕከል · የተከለከለ",
  "Sign in": "ግባ",
  "Sign in failed": "መግባት አልተሳካም",
  "Loading...": "በመጫን ላይ...",
  Save: "አስቀምጥ",
  Cancel: "ተሠዋ",
  Delete: "አጥፋ",
  Close: "ዝጋ",
  Back: "ተመለስ",
  Confirm: "አረጋግጥ",
  Search: "ፈልግ",
  Today: "ዛሬ",
  Week: "ሳምንት",
  Month: "ወር",
  Year: "ዓመት",
  All: "ሁሉም",
  "Not authorized": "ፈቃድ የለህም",
  "You do not have access to this page.": "ወደዚህ ገጽ መዳሰስ አትችልም።",
  "Go to my dashboard": "ወደ የእኔ ዳሽቦርድ ሂድ",

  // ---- Kitchen / Bar stations ---------------------------------------------
  "Kitchen Ticket Queue": "የመጠብቻ ትኬት ወረፋ",
  "Bar / Coffee Queue": "የባር / ኮፊ ወረፋ",
  "Kitchen & Bar Tickets": "የመጠብቻ እና ባር ትኬቶች",
  "Live station board": "ቀጥታ የጣቢያ ሰሌዳ",
  "Start Cooking": "ማበስል ጀምር",
  "Start Preparing": "ማዘጋጀት ጀምር",
  "Mark Ready": "ዝግጁ አስብ",
  "Release to Kitchen": "ወደ መጠብቻ ላክ",
  "Hold": "አቁም",
  "Held": "ቆይቷል",
  Queued: "ወረፋ",
  Preparing: "በማዘጋጀት ላይ",
  Ready: "ዝግጁ",
  "No tickets yet": "እስካሁን ትኬት የለም",
  "Waiting for new orders…": "አዲስ ትዕዛዞች በመጠበቅ ላይ…",
  "minutes in preparation": "ደቂቃ በዝግጅት ላይ",
  "Ticket queue": "የትኬት ወረፋ",
  "Kitchen station board": "የመጠብቻ ጣቢያ ሰሌዳ",
  "Beverage & coffee dispatch board": "የመጠጥ እና ኮፊ ማራኪያ ሰሌዳ",
  "On Hold": "ቆም ብሏል",
  "Release & Start": "አላፍተው ጀምር",
  "In Progress": "በሂደት ላይ",
  "Ready for Service": "ለአገልግሎት ዝግጁ",
  "All caught up!": "ሁሉም ተዘጋጅቷል!",
  "No pending orders in the": "በ",
  "queue.": " ወረፋ ውስጥ በመጠበቅ ላይ ያለ ትዕዛዝ የለም።",
  Station: "ጣቢያ",
  "m elapsed": " ደቂቃ አልፎበታል",
  "Kitchen Console": "የመጠብቻ ማዕከል",
  "Hot Station & Cook Line": "ሙቅ ጣቢያ እና የማብሰያ መስመር",
  "Live Prep Feed": "ቀጥታ የዝግጅት ልኬት",
  "Kitchen Order Tickets": "የመጠብቻ ትዕዛዝ ትኬቶች",
  "New Kitchen Order": "አዲስ የመጠብቻ ትዕዛዝ",
  "New Bar Order": "አዲስ የባር ትዕዛዝ",
  "Kitchen 86 / In-Stock": "የመጠብቻ ዕጣት / ክምችት",
  "Bar 86 / In-Stock": "የባር ዕጣት / ክምችት",
  "Toggle dish availability for diner menu": "የእንግዳ ዝርዝር ምግብ መገኘት ይቀይሩ",
  "Toggle drink availability for diner menu": "የእንግዳ ዝርዝር መጠጥ መገኘት ይቀይሩ",
  "In Stock": "አለ",
  "86'd": "አልቋል",
  "Toggle stock status": "የክምችት ሁኔታ ይቀይሩ",
  "Station Privacy Enforced": "የጣቢያ ግሊ ተግባራዊ ሆኗል",
  "Kitchen Console Restricted": "የመጠብቻ ማዕከል ተከልክሏል",
  "Bar Console Restricted": "የባር ማዕከል ተከልክሏል",
  "Bar Staff": "የባር ሠራተኛ",
  "Kitchen Staff can only access the Hot Kitchen console. Bar tickets and beverage prep are managed by the bar team.": "የመጠብቻ ሠራተኛ የሚደሰሰው የሙቅ መጠብቻ ማዕከል ብቻ ነው። የባር ትኬቶችና የመጠጥ ዝግጅት በባር ቡድን ይቆጣጠራሉ።",
  "Bar terminals and personnel cannot view or manage the Hot Kitchen console. Culinary order tickets and recipes are protected by station privacy.": "የባር ማዕከሎችና ሠራተኞች የሙቅ መጠብቻ ማዕከልን ማየት ወይም ማስተዳደር አይችሉም። የምግብ ትኬቶችና ሬሲፒዎች በጣቢያ ግሊ የተጠበቁ ናቸው።",
  "Return to Bar Console": "ወደ ባር ማዕከል ተመለስ",
  "Return to Kitchen Console": "ወደ መጠብቻ ማዕከል ተመለስ",
  "Switch Role / Re-login": "ሚና ቀይር / እንደገና ግባ",
  "Bar Console": "የባር ማዕከል",
  "Coffee, Cocktails & Beverages": "ኮፒ፣ ኮከይል እና መጠጦች",
  "Bar Queue": "የባር ወረፋ",
  "Drink & Beverage Orders": "የመጠጥ ትዕዛዞች",
  "Toggle coffee & cocktail availability": "የኮፊ እና ኮከይል መገኘት ይቀይሩ",
  "Toggle drink availability": "የመጠጥ መገኘት ይቀይሩ",
  "Kitchen personnel and chefs cannot view or manage the Bar & Beverage console. Beverage order tickets and recipes are protected by station privacy.": "የመጠብቻ ሠራተኞችና ሼፎች የባር እና መጠጦች ማዕከልን ማየት ወይም ማስተዳደር አይችሉም። የመጠጥ ትኬቶችና ሬሲፒዎች በጣቢያ ግሊ የተጠበቁ ናቸው።",

  // ---- Floor / waiter ------------------------------------------------------
  "Floor Service Console": "የገበታ አገልግሎት ማዕከል",
  "Dining Room & Delivery": "የመመገቢያ ክፍል እና አቅርቦት",
  "Waiter Active": "መዝጊያ ንቁ",
  "Call Waiter Alerts": "የመዝጊያ ጥሪ ማዕወሮች",
  "Live assistance requests from diner tables": "ከእንግድ ጠረጴዞች ቀጥታ የእገዛ ጥያቄዎች",
  "No pending waiter calls. All tables attended!": "በመጠበቅ ላይ የሚገኝ የመዝጊያ ጥሪ የለም። ሁሉም ጠረጴዞች ተአምነዋል!",
  "Requested waiter assistance at table": "በጠረጴዛ ላይ የመዝጊያ እገዛ ተጠይቋል",
  "Tables Browsing Menu": "ዝርዝር እየተመለከቱ ያሉ ጠረጴዞች",
  "Live device presence before placing order": "ትዕዛዝ ከመስጠቱ በፊት ቀጥታ የመሣሪያ መገኘት",
  "Active Sessions": "ንቁ ክፍለ ጊዜያት",
  "No tables have opened the menu recently.": "በቅርቡ ዝርዝር የከፈተ ጠረጴዛ የለም።",
  "Opened the menu": "ዝርዝር ከፍተዋል",
  "Food & Beverage Dispatch Queue": "የምግብ እና መጠጥ ማራኪያ ወረፋ",
  "Enter 4-digit code to complete delivery": "አቅርቦቱ ለማጠናቀቅ ባለ 4 አሃዝ ኮድ ያስገቡ",
  "Waiter Called": "መዝጊያ ተጠራዋል",
  "needs assistance": "እገዛ ያስፈልገዋል",
  "Order Ready": "ትዕዛዝ ዝግጁ ነው",
  "is ready to serve": "ለማድረስ ዝግጁ ነው",
  "Failed to mark order served": "ትዕዛዙን ዝግጁ አድርጎ ማስመዝገብ አልተሳካም",
  "Just now": "አሁን",
  "m ago": " ደቂቃ አፈር",
  "h ago": " ሰዓት አፈር",
  "d ago": " ቀን አፈር",
  READY: "ዝግጁ",
  "Select another status to view its orders.": "ትዕዛዞቹን ለማየት ሌላ ሁኔታ ይምረጡ።",
  "Note:": "ማስታወሻ፦",
  "Ready to Serve": "ለማድረስ ዝግጁ",
  "Cooking / Preparing": "በማበስል / በማዘጋጀት ላይ",
  "Cooking": "በማበስል ላይ",
  "Order Intake": "ትዕዛዝ መቀበያ",
  "Order Intake / Queued": "ትዕዛዝ መቀበያ / ወረፋ",
  "Enter Pickup Code & Serve": "የመረጋገጫ ኮድ ያስገቡ እና ያድረሱ",
  "Verify Pickup Code": "የመረጋገጫ ኮድ ያረጋግጡ",
  "Incorrect code. Please verify with guest or cashier.":
    "ኮዱ ትክክል አይደለም። ከእንግዳው ወይም ከገንዘብ ተቀባዩ ጋር ያረጋግጡ።",
  "Correct code — this order can be served.": "ኮዱ ትክክል ነው — ይህ ትዕዛዝ ሊደርስ ይችላል።",
  "Code verified. Order served.": "ኮዱ ተረጋግጧል። ትዕዛዙ ደርሷል።",
  "Checking code…": "ኮድ በማረጋገጥ ላይ…",
  "Confirming delivery…": "ማድረሱን በማረጋገጥ ላይ…",
  "Confirm the hand-off — the code is verified against the kitchen record.":
    "እጅ ሽግግሩን ያረጋግጡ — ኮዱ ከመጠብቻ መዝገብ ጋር ይረጋገጣል።",
  "Ask the guest for the 4-digit code shown on their order screen to confirm handoff.":
    "ለእጅ ሽግግር ማረጋገጫ የእንግዳውን ባለ 4 አሃዝ ኮድ ከትዕዛዝ ማሳያው ላይ ይጠይቁ።",
  "Confirm Hand-off": "እጅ ሽግግር አረጋግጥ",
  "No orders ready for delivery at the moment.": "በዚህ ጊዜ ለማድረስ ዝግጁ የሆነ ትዕዛዝ የለም።",
  "No orders currently in the cooking pipeline.": "በአሁኑ ሰዓት በማበሰያ ሂደት ላይ የሆነ ትዕዛዝ የለም።",
  "No freshly queued orders.": "አዲስ ወረፋ የወጣ ትዕዛዝ የለም።",
  "Waiting for Chef": "ሼፍ በመጠበቅ ላይ",
  "Waiter calls": "የመዝጊያ ጥሪዎች",
  "Acknowledge": "ተቀበል",
  Resolve: "ፍታ",

  // ---- Cashier -------------------------------------------------------------
  "Cashier & Billing Console": "የገንዘብ ተቀባይ እና ጥፊት ማዕከል",
  "Verification & Walk-in Terminal": "ማረጋገጫ እና ቀጥታ ገቢ ማዕከል",
  "POS Active": "POS ንቁ",
  "Verify Payments": "ክፍያዎችን ያረጋግጡ",
  "Walk-in Order": "ቀጥታ ገቢ ትዕዛዝ",
  "Incoming Diner Proofs": "የገቡ የእንግዳ ማረጋገጫዎች",
  "Inspect SMS screenshots or transfer receipts. Enter or verify transaction IDs before approval.":
    "የኤስኤምኤስ ስክሪንሾት ወይም የማስተላለፊያ ደረሰኝ ይመልከቱ። ከፈቃድ በፊት የግብይት መለያ ያስገቡ ወይም ያረጋግጡ።",
  "Known TX IDs": "የታወቁ የግብይት መለያዎች",
  Approve: "ፍቃድ ስጥ",
  Reject: "ውድቅ አድርግ",
  "Transaction ID": "የግብይት መለያ",
  "Payment approved and order sent to the kitchen.":
    "ክፍያው ጸድቋል፣ ትዕዛዙም ወደ ማብሰያ ቤት ተልኳል።",
  "Walk-in order created and sent to the kitchen.":
    "በአካል የተደረገው ትዕዛዝ ተፈጥሮ ወደ ማብሰያ ቤት ተልኳል።",
  "Failed to send walk-in order to the kitchen.":
    "በአካል የተደረገውን ትዕዛዝ ወደ ማብሰያ ቤት መላክ አልተቻለም።",
  "Payment rejected. Customer notified to upload valid proof.":
    "ክፍያው ውድቅ ሆኗል። ደንበኛው ትክክለኛ ማረጋገጫ እንዲቀመጥ ተገንዝቧል።",
  "Walk-In / Phone Order Terminal": "ቀጥታ ገቢ / ስልክ ትዕዛዝ ማዕከል",
  "Directly take orders for walk-in guests or phone orders, collect cash or transfer, and auto-route to kitchen and bar.":
    "ለቀጥታ ገቢ እንግዶች ወይም ለስልክ ትዕዛዝ ይውሰዱ፣ ጥሪት ወይም ማስተላለፊያ ይቀበሉ፣ ወደ መጠብቻ እና ባር በራስ-ሰር ይላኩ።",
  "Payment History": "የክፍያ ታሪክ",
  "Super admins can widen the range and export the full history as CSV.": "ዋና አስተዳዳሪዎች ጊዜውን ማሰፋት እና ሙሉ ታሪኩን እንደ CSV ማውረድ ይችላሉ።",
  "Week Payment History": "የሳምንት የክፍያ ታሪክ",
  "Complete Payment History": "ሙሉ የክፍያ ታሪክ",
  "Screenshots & transactions": "ስክሪንሾቶች እና ግብይቶች",
  "All payments submitted by diners, with their receipts":
    "በእንግዶች የተላኩ ሁሉም ክፍያዎች ከደረሰኞቻቸው ጋር",
  Amount: "መጠን",
  Status: "ሁኔታ",
  Refresh: "አድስ",
  Payments: "ክፍያዎች",
  Order: "ትዕዛዝ",
  Date: "ቀን",
  Takeaway: "ውሰድ",
  Service: "አገልግሎት",
  Screenshot: "ስክሪንሾት",
  "No screenshot": "ስክሪንሾት የለም",
  View: "ይመልከቱ",
  Verified: "ተረጋግጧል",
  "Pending verification": "ማረጋገጫ በመጠበቅ ላይ",
  Refunded: "ተመልሷል",
  Failed: "አልተሳካም",
  Cash: "ጥሪት",
  Transfer: "ማስተላለፊያ",
  Table: "ጠረጴዛ",
  "Verified by": "የተረጋገጠው",
  "Payment history needs one database update. Ask an administrator to run backend/supabase/2026-11-06-payment-history.sql in the Supabase SQL editor.":
    "የክፍያ ታሪክ አንድ የዳታቤዝ ማሻሻያ ያስፈልገዋል። አስተዳዳሪው backend/supabase/2026-11-06-payment-history.sql በሱ፣ቤዝ SQL አርታሚ ውስጥ እንዲያከናውን ይጠይቁ።",
  "No payments in this period.": "በዚህ ጊዜ ውስጥ ክፍያ የለም።",
  "No Pending Payment Verifications": "በመጠበቅ ላይ ያለ የክፍያ ማረጋገጫ የለም",
  "Incoming mobile transfers and customer receipts will appear here in real time.": "የሚገቡ ሞባይል ማስተላለፊያዎችና የደንበኛ ደረሰኞች እዚህ በቀጥታ ይታያሉ።",
  "Click to view full receipt": "ሙሉ ደረሰኝ ለማየት ይጫኑ",
  "Order #": "ትዕዛዝ ቁጥር",
  "Account:": "ሂሳብ፦",
  "Enter Bank TX ID...": "የባንክ የግብይት መለያ ያስገቡ...",
  "Bank TX ID is required to approve.": "ፈቃድ ለመስጠት የባንክ የግብይት መለያ ያስፈልጋል።",
  "Enter the bank transaction ID first": "መጀመሪያ የባንክ የግብይት መለያውን ያስገቡ",
  "Approve & Send to Kitchen": "ፍቃድ ይስጡ እና ወደ ማብሰያ ቤት ይላኩ",
  "Approve and send the order to the kitchen": "ትዕዛዙን ፍቃድ ሰጥተው ወደ ማብሰያ ቤት ይላኩ",
  "Duplicate Warning:": "የድጋሚ ማሳወቂያ፦",
  "This transaction ID has already been used for another order! Please double-check the customer screenshot.": "ይህ የግብይት መለያ ለሌላ ትዕዛዝ ተጠቅሟል! እባክዎ የደንበኛውን ስክሪንሾት ደግመው ያረጋግጡ።",
  "Payment Transfer Screenshot": "የክፍያ ማስተላለፊያ ስክሪንሾት",

  // ---- Walk-in POS ---------------------------------------------------------
  "Select Dishes & Drinks": "ምግቦችና መጠጦችን ይምረጡ",
  "items available": "እቃዎች ዝግጁ ናቸው",
  "Search dishes, burgers, tejs, coffee...": "ምግብ፣ በርገር፣ ቸኮሌት፣ ኮፊ ይፈልጉ...",
  "Order & Settlement": "ትዕዛዝ እና ሂሳብ ክፍያ",
  "Dine-in": "በገበታ ላይ",
  "Assign Table Number": "የጠረጴዛ ቁጥር ይመድቡ",
  "Guest Phone Number (Takeaway)": "የእንግዳ ስልክ ቁጥር (ውሰድ)",
  "No dishes selected yet.": "እስካሁን ምንም ምግብ አልተመረጠም።",
  Subtotal: "ንዑስ ድምር",
  "Grand Total": "አጠቃላይ ድምር",
  "Payment Method": "የክፍያ ዘዴ",
  "Cash Collected": "ጥሪት ተሰብስቧል",
  "Bank / Telebirr": "ባንክ / ቴሌብር",
  "Transaction ID / Reference *": "የግብይት መለያ / ማጣቀሻ *",
  "Settle Order & Print KOT": "ትዕዛዝ ይዘጋጁ እና KOT ያትሙ",
  "Settling…": "በመዘጋጀት ላይ...",
  "Order settled & routed to kitchen & bar!": "ትዕዛዙ ተዘጋጀ! ወደ መጠብቻና ባር ተልኳል!",
  "Pickup code for the guest": "ለእንግዳው የመረጋገጫ ኮድ",
  "Start a new walk-in order": "አዲስ ቀጥታ ገቢ ትዕዛዝ ጀምር",
  "Walk-in": "ቀጥታ ገቢ",
  "Failed to approve payment": "ክፍያውን ፈቃድ መስጠት አልተሳካም",
  "Failed to reject payment": "ክፍያውን ውድቅ ማድረግ አልተሳካም",
  "Walk-in Order created successfully!": "ቀጥታ ገቢ ትዕዛዝ በተሳካ ሁኔታ ተፈጥሯል!",
  "New Payment to Verify": "ለማረጋገጥ አዲስ ክፍያ",
  "awaiting review": "በግምገማ ላይ ያለ",
  "Cashier Billing Console": "የገንዘብ ተቀባይ ጥፊት ማዕከል",

  // ---- Admin ---------------------------------------------------------------
  "Menu Manager": "ዝርዝር አቆጣጣሪ",
  "Menu Catalog": "የዝርዝር ካታሎግ",
  "Staff Consoles": "የሠራተኛ ማዕከላት",
  "Diner View": "የእንግዳ እይታ",
  "Menu & Content": "ዝርዝር እና ይዘት",
  "Menu items, prices and availability": "የዝርዝር እቃዎች፣ ዋጋዎች እና መገኘት",
  Tables: "ጠረጴዞች",
  "Table QR Codes": "የጠረጴዛ ኳር ኮዶች",
  "Payment Accounts": "የክፍያ ሂሳቦች",
  Analytics: "ትንታኔ",
  "Performance Analytics": "የአፈጻጸም ትንታኔ",
  "Sales Insights & Kitchen Velocity": "የሽያጭ እይታ እና የመጠብቻ ፍጥነት",
  "Export Report": "ሪፖርት ላክ",
  "Gross Revenue": "ጠቅላላ ሽያጭ",
  "Completed Orders": "የተጠናቀቁ ትዕዛዞች",
  "Active Queue": "ንቁ ወረፋ",
  "Avg Order Value": "አማካይ የትዕዛዝ ዋጋ",
  "Avg Prep Time": "አማካይ የዝግጅት ጊዜ",
  "Top Sellers": "ከፍተኛ ሻጮች",
  "Sales by Category": "ሽያጭ በመድብ",
  "Order Volume": "የትዕዛዝ መጠን",
  Revenue: "ሽያጭ",
  "Staff Accounts": "የሠራተኛ ሂሳቦች",
  "Manage & reset staff passwords": "የሠራተኛ የይለፍ ቃላትን ያስተዳድሩ እና ዳግም ያስጀምሩ",
  "Reset Password": "የይለፍ ቃል ዳግም አስጀምር",
  "Send reset email": "ዳግም ማስጀመሪያ ኢሜይል ላክ",
  "New password": "አዲስ የይለፍ ቃል",
  "Password updated.": "የይለፍ ቃሉ ተሻሽሏል።",
  "Role": "ሥራ",
  Email: "ኢሜይል",
  "Last seen": "የመጨረሻ የታየበት",
  Active: "ንቁ",
  Inactive: "ድቾቅ",
  Never: "አልታየም",
  "Staff accounts are hidden for this role.": "የሠራተኛ ሂሳቦች ለዚህ ሥራ ተደብቀዋል።",
  "Passwords are changed instantly. Tell the staff member their new password so they can sign in — the change takes effect on their very next login.":
    "የይለፍ ቃላቱ ወዲያውኑ ይቀየራሉ። አዲሱን የይለፍ ቃል ለሠራተኛው ይንገሩ እንዲገባ — ለውጡ በቀጥታ በሚቀጥለው መግቢያው ላይ ተግባራዊ ይሆናል።",

  // ---- Raw role slugs (staff accounts table) ------------------------------
  super_admin: "ዋና አስተዳዳሪ",
  owner: "ባለቤት",
  admin: "አስተዳዳሪ",
  kitchen: "መጠብቻ",
  bar: "ባር",
  bartender: "ባር / ባሪስታ",
  waiter: "መዝጊያ",
  cashier: "ገንዘብ ተቀባይ",

  // ---- RoleGuard / auth screens -------------------------------------------
  "This Section": "ይህ ክፍል",
  "Authentication Required": "ማረጋገጫ ያስፈልጋል",
  "Staff Portal Login": "የሠራተኛ መግቢያ",
  "Go to Staff Login": "ወደ የሠራተኛ መግቢያ ሂድ",
  "Super Admin Protected": "በዋና አስተዳዳሪ የተጠበቀ",
  "Super Admin Authorization Required": "የዋና አስተዳዳሪ ፈቃድ ያስፈልጋል",
  "Access Restricted · Station Isolation": "መዳሰሻ ተከልክሏል · የጣቢያ ልዩነት",
  "Station Permission Denied": "የጣቢያ ፈቃድ የለም",
  "Return to My Console": "ወደ እኔ ማዕከል ተመለስ",
  "Return to Permitted Console": "ወደ ፈቃድ ያለው ማዕከል ተመለስ",
  "Switch Account / Login": "መለያ ቀይር / ግባ",
  "Log in as Super Admin": "እንደ ዋና አስተዳዳሪ ግባ",
  "Station Policy:": "የጣቢያ ፖሊሲ፦",
  "Current Role:": "የአሁን ሥራ፦",
  "You must sign in with a valid staff role to access": "ይህን ክፍል ለመዳሰስ ትክክለኛ የሠራተኛ ሚና መጠቀም አለብዎ",
  "contains sensitive restaurant financial or configuration settings and is strictly reserved for the": "ይህ ክፍል ስራውን የሚመለከት የፊናንስ ወይም የቅንብር መረጃ ስላለው በመጽናት ለ",
  "You are signed in as": "የገቡት እንደ",
  "Staff members cannot access unauthorized roles or admin consoles.": "ሠራተኞች ፈቃድ የሌላቸውን ሚናዎች ወይም የአስተዳዳሪ ማዕከላት መዳሰስ አይችሉም።",
};

// ---------------------------------------------------------------------------

interface StaffLangCtx {
  lang: StaffLang;
  setLang: (l: StaffLang) => void;
  t: (key: string) => string;
}

const Ctx = createContext<StaffLangCtx | null>(null);

export function StaffLangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<StaffLang>("am");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "am" || saved === "om") setLangState(saved);
    setReady(true);
  }, []);

  const setLang = useCallback((l: StaffLang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const t = useCallback(
    (key: string) => (lang === "am" ? am[key] || key : key),
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  // Suppress a flash of English until the stored preference is read.
  if (!ready) return <>{children}</>;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStaffLang(): StaffLangCtx {
  const ctx = useContext(Ctx);
  // Outside a provider (e.g. a static export) default to Amharic passthrough.
  return ctx ?? { lang: "am", setLang: () => {}, t: (k) => am[k] || k };
}

/** Short helper for one-off strings inside staff components. */
export function useT() {
  return useStaffLang().t;
}

export function getStaffLang(): StaffLang {
  if (typeof window === "undefined") return "am";
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "om" ? saved : "am";
}

/**
 * Pick a localized value out of a DB `*_i18n` jsonb object.
 * Falls back: requested language → English → first available value.
 */
export function loc(
  obj: Record<string, string> | undefined | null,
  lang: StaffLang,
): string {
  if (!obj) return "";
  return obj[lang] || obj.en || Object.values(obj)[0] || "";
}

export const STAFF_LANG_LABEL: Record<StaffLang, string> = {
  en: "EN",
  am: "AM",
  om: "OM",
};
