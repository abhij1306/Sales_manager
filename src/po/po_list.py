import streamlit as st
from config.database import get_connection
from scraper.po_scraper import extract_po_header, extract_items
from scraper.ingest_po import po_ingestion_service
from bs4 import BeautifulSoup

def render_po_list():
    # Header
    col1, col2 = st.columns([6, 2])
    with col1:
        st.markdown("## Purchase Orders")
    with col2:
        if st.button("➕ New PO", type="primary", use_container_width=True):
            st.session_state.po_action = 'create'
            st.rerun()

    # Upload Section (Always Visible)
    st.caption("Upload PO Files (HTML)")
    uploaded_files = st.file_uploader(
        "Upload POs", 
        accept_multiple_files=True, 
        type=['html'],
        key="po_uploader",
        label_visibility="collapsed"
    )
    
    if uploaded_files:
        with st.spinner("Processing..."):
            success_count = 0
            error_count = 0
            
            for file in uploaded_files:
                try:
                    content = file.read().decode('utf-8')
                    soup = BeautifulSoup(content, "lxml")
                    
                    header = extract_po_header(soup)
                    items = extract_items(soup)
                    
                    success, warnings = po_ingestion_service.ingest_po(header, items)
                    
                    if success:
                        success_count += 1
                        st.success(f"✅ {file.name}")
                        for w in warnings:
                            st.info(w)
                    else:
                        error_count += 1
                        st.error(f"❌ {file.name}")
                        
                except Exception as e:
                    error_count += 1
                    st.error(f"❌ {file.name}: {str(e)}")
            
            if success_count > 0 or error_count > 0:
                st.success(f"**Done:** {success_count} uploaded, {error_count} failed")
                if st.button("Clear Results"):
                    st.rerun()

    # Search
    search = st.text_input("🔍 Search PO Number or Vendor", placeholder="Search...")
    
    st.markdown("---")
    
    # Fetch Data
    conn = get_connection()
    query = """
        SELECT po_number, po_date, supplier_name, po_value, po_status
        FROM purchase_orders 
        ORDER BY created_at DESC
    """
    
    if search:
        query = f"SELECT * FROM ({query}) WHERE CAST(po_number AS TEXT) LIKE '%{search}%' OR supplier_name LIKE '%{search}%'"
    
    pos = conn.execute(query).fetchall()
    conn.close()
    
    # Table Header
    h1, h2, h3, h4 = st.columns([2, 2, 4, 2])
    h1.markdown("**PO Number**")
    h2.markdown("**Date**")
    h3.markdown("**Status**")
    h4.markdown("**Amount**")
    
    # Table Body
    if not pos:
        st.info("No purchase orders found.")
        return

    for po in pos:
        with st.container():
            c1, c2, c3, c4 = st.columns([2, 2, 4, 2])
            
            if c1.button(f"PO-{po['po_number']}", key=f"btn_{po['po_number']}"):
                st.session_state.selected_po = po['po_number']
                st.session_state.po_action = 'view'
                st.rerun()
                
            c2.text(po['po_date'])
            c3.text(po['po_status'] or "New")
            c4.text(f"₹{po['po_value']:,.0f}" if po['po_value'] else "-")
            
            st.markdown("<hr style='margin: 0.2rem 0; border-top: 1px solid #1a1a1a;'>", unsafe_allow_html=True)
