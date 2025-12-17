import streamlit as st
from config.database import get_connection

def render_dc_list():
    st.markdown("## Delivery Challans")
    
    # Header area
    col1, col2 = st.columns([6, 2])
    with col2:
        if st.button("➕ Create from PO", type="primary", use_container_width=True):
            st.info("Please go to a Purchase Order and click 'Create Delivery Challan'")
            
    # Search
    search = st.text_input("🔍 Search DC Number, PO...", label_visibility="collapsed", placeholder="Search challans...")
    st.markdown("---")
    
    # Fetch DCs
    conn = get_connection()
    
    query = """
        SELECT dc.*, po.supplier_name, COUNT(dci.id) as item_count
        FROM delivery_challans dc
        LEFT JOIN purchase_orders po ON dc.po_number = po.po_number
        LEFT JOIN delivery_challan_items dci ON dc.dc_number = dci.dc_number
        GROUP BY dc.dc_number
        ORDER BY dc.created_at DESC
    """
    
    if search:
        query = f"SELECT * FROM ({query}) WHERE dc_number LIKE '%{search}%' OR CAST(po_number AS TEXT) LIKE '%{search}%'"
    
    dcs = conn.execute(query).fetchall()
    
    if not dcs:
        st.info("No delivery challans found.")
        conn.close()
        return
    
    # Table Header
    h1, h2, h3, h4, h5 = st.columns([2, 2, 3, 2, 2])
    h1.markdown("**DC Number**")
    h2.markdown("**DC Date**")
    h3.markdown("**PO / Vendor**")
    h4.markdown("**Items**")
    h5.markdown("**Vehicle**")
    
    # Table Body
    for dc in dcs:
        with st.container():
            c1, c2, c3, c4, c5 = st.columns([2, 2, 3, 2, 2])
            
            if c1.button(f"DC-{dc['dc_number']}", key=f"dc_{dc['dc_number']}"):
                st.session_state.selected_dc = dc['dc_number']
                st.info("DC Detail View - Coming Soon")
            
            c2.text(dc['dc_date'])
            c3.text(f"PO-{dc['po_number']} | {dc['supplier_name']}")
            c4.text(f"{dc['item_count']} items")
            c5.text(dc['vehicle_no'] or "-")
            
            
            st.markdown("<hr style='margin: 0.5rem 0; border-top: 1px solid #333333;'>", unsafe_allow_html=True)
    
    conn.close()
