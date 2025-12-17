import streamlit as st
from src.dashboard import render_dashboard
from src.po.po_list import render_po_list
from src.po.po_create import render_po_create
from src.dc.dc_list import render_dc_list
from config.database import init_database

# Page Config
st.set_page_config(
    page_title="Sales Manager",
    page_icon="📊",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize DB on first load
if 'db_initialized' not in st.session_state:
    init_database()
    st.session_state.db_initialized = True

# Initialize navigation state
if 'nav' not in st.session_state:
    st.session_state.nav = "Dashboard"

# Custom CSS - Clean Accounting Interface
st.markdown("""
<style>
    /* Global Reset */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
    
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Hide Streamlit Branding */
    #MainMenu {visibility: hidden;}
    header {visibility: hidden;}
    footer {visibility: hidden;}
    .stDeployButton {display: none;}

    /* Pure Black Background */
    .stApp {
        background-color: #000000;
        color: #e8e8e8;
    }

    /* Ultra-Compact Layout */
    .block-container {
        padding-top: 1rem !important;
        padding-bottom: 0.5rem !important;
        padding-left: 0.75rem !important;
        padding-right: 0.75rem !important;
        max-width: 100% !important;
    }
    
    .element-container {
        margin-bottom: 0.15rem !important;
    }
    
    div[data-testid="column"] {
        gap: 0.3rem !important;
    }

    /* Typography - Compact */
    h1, h2, h3, h4, h5, h6 {
        color: #ffffff !important;
        font-weight: 600;
        letter-spacing: -0.3px;
        margin: 0 !important;
        padding: 0 !important;
    }
    
    h1 { font-size: 1.5rem !important; }
    h2 { font-size: 1.2rem !important; }
    h3 { font-size: 1.0rem !important; }

    /* Clean Cards */
    .card {
        background-color: #0a0a0a;
        border: 1px solid #1a1a1a;
        border-radius: 4px;
        padding: 8px 10px;
        margin-bottom: 0.3rem;
    }
    
    .metric-value {
        font-size: 18px;
        font-weight: 600;
        color: #fff;
        margin: 0;
    }

    .metric-label {
        font-size: 10px;
        color: #888;
        font-weight: 500;
        margin-bottom: 2px;
    }

    /* Sidebar - Compact & Non-Collapsible */
    [data-testid="stSidebar"] {
        background-color: #050505;
        border-right: 1px solid #1a1a1a;
    }
    
    /* FORCE HIDE sidebar collapse button */
    [data-testid="collapsedControl"],
    button[kind="header"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
    }
    
    [data-testid="stSidebar"] [data-testid="stVerticalBlock"] {
        gap: 0.1rem !important;
        padding-top: 0.5rem;
    }
    
    /* Sidebar Title - Center Aligned */
    [data-testid="stSidebar"] h1 {
        font-size: 1.4rem !important;
        margin-bottom: 0.8rem !important;
        padding: 0 !important;
        text-align: center !important;
        font-weight: 700 !important;
    }
    
    /* Navigation Buttons - FORCE Left Aligned */
    [data-testid="stSidebar"] .stButton {
        text-align: left !important;
        display: block !important;
    }
    
    [data-testid="stSidebar"] .stButton > button {
        width: 100% !important;
        background-color: transparent !important;
        border: none !important;
        color: #888 !important;
        text-align: left !important;
        padding: 0.3rem 0.5rem !important;
        justify-content: flex-start !important;
        transition: all 0.15s;
        font-weight: 500;
        font-size: 0.9rem;
        height: auto !important;
        display: flex !important;
        align-items: center !important;
    }
    
    /* Force all inner elements to left align */
    [data-testid="stSidebar"] .stButton > button > div,
    [data-testid="stSidebar"] .stButton > button > div > div,
    [data-testid="stSidebar"] .stButton > button p {
        text-align: left !important;
        justify-content: flex-start !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
    }
    
    [data-testid="stSidebar"] .stButton > button:hover {
        color: #fff !important;
        background-color: #0a0a0a;
        border-radius: 3px;
    }
    
    [data-testid="stSidebar"] .stButton > button[kind="primary"] {
        background-color: #0a0a0a;
        color: #fff !important;
        border-left: 2px solid #0066cc;
        border-radius: 0 3px 3px 0;
        padding-left: 8px;
        font-weight: 600;
    }

    /* Buttons - Clean */
    .stButton > button {
        background-color: #0a0a0a;
        color: #fff !important;
        border: 1px solid #2a2a2a;
        border-radius: 3px;
        padding: 0.25rem 0.6rem;
        font-size: 0.85rem;
        transition: all 0.15s;
    }
    
    .stButton > button:hover {
        background-color: #1a1a1a;
        border-color: #3a3a3a;
    }
    
    .stButton > button[kind="primary"] {
        background-color: #0066cc;
        border-color: #0066cc;
    }
    
    .stButton > button[kind="primary"]:hover {
        background-color: #0052a3;
    }

    /* Inputs - Compact */
    .stTextInput input, .stNumberInput input, .stDateInput input, 
    .stSelectbox select, .stTextArea textarea {
        background-color: #0a0a0a !important;
        color: #fff !important;
        border: 1px solid #1a1a1a !important;
        border-radius: 3px;
        font-size: 0.85rem;
        padding: 0.3rem !important;
        min-height: 0 !important;
    }
    
    .stTextInput input:focus, .stNumberInput input:focus, 
    .stDateInput input:focus, .stSelectbox select:focus {
        border-color: #0066cc !important;
        box-shadow: 0 0 0 1px #0066cc !important;
    }

    /* Tables - Professional */
    [data-testid="stDataFrame"] {
        border: 1px solid #1a1a1a;
        border-radius: 3px;
    }
    
    [data-testid="stDataFrame"] table {
        font-size: 0.85rem;
    }
    
    [data-testid="stDataFrame"] th {
        background-color: #0a0a0a !important;
        color: #aaa !important;
        font-weight: 600;
        padding: 6px 8px !important;
        border-bottom: 1px solid #1a1a1a !important;
    }
    
    [data-testid="stDataFrame"] td {
        padding: 5px 8px !important;
        border-bottom: 1px solid #0a0a0a !important;
    }

    /* Expanders - Clean */
    .streamlit-expanderHeader {
        background-color: #0a0a0a;
        border: 1px solid #1a1a1a;
        border-radius: 3px;
        padding: 0.4rem 0.6rem !important;
        font-size: 0.9rem;
    }

    /* Utilities */
    hr {
        margin: 0.4rem 0 !important;
        border-color: #1a1a1a;
    }
    
    .stMarkdown:empty { 
        display: none !important; 
    }
    
    /* Remove extra spacing */
    .main .block-container {
        padding-top: 0.5rem !important;
    }

</style>
""", unsafe_allow_html=True)

# Navigation with Selection Box Design
with st.sidebar:
    st.markdown("""
        <div style="text-align: center; padding: 0.5rem 0 1rem 0;">
            <h1 style="margin: 0; font-size: 1.4rem; font-weight: 700;">
                📊 Sales Manager
            </h1>
        </div>
    """, unsafe_allow_html=True)
    st.markdown("---")
    
    # Navigation options with icons
    nav_options = [
        ("📊", "Dashboard"),
        ("🛒", "Purchase Orders"),
        ("🚚", "Delivery Challans"),
        ("📄", "GST Invoices"),
        ("📈", "Reports")
    ]
    
    for icon, label in nav_options:
        is_active = st.session_state.nav == label
        active_class = "active" if is_active else ""
        
        if st.button(
            f"{icon}  {label}",
            key=f"nav_{label}",
            type="primary" if is_active else "secondary"
        ):
            st.session_state.nav = label
            st.rerun()

# Routing
if st.session_state.nav == "Dashboard":
    render_dashboard()
elif st.session_state.nav == "Purchase Orders":
    if 'po_action' not in st.session_state:
        st.session_state.po_action = 'list'
    
    if st.session_state.po_action == 'list':
        render_po_list()
    elif st.session_state.po_action == 'create':
        render_po_create()
    elif st.session_state.po_action == 'view':
        from src.po.po_detail import render_po_detail
        render_po_detail()

elif st.session_state.nav == "Delivery Challans":
    if 'dc_action' not in st.session_state:
        st.session_state.dc_action = 'list'
    
    if st.session_state.dc_action == 'list':
        render_dc_list()
    elif st.session_state.dc_action == 'create' or 'dc_po_context' in st.session_state:
        from src.dc.dc_create import render_dc_create
        render_dc_create()
elif st.session_state.nav == "GST Invoices":
    st.title("GST Invoices")
    st.info("Coming Soon")
elif st.session_state.nav == "Reports":
    st.title("Reports")
    st.info("Coming Soon")
