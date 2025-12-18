import streamlit as st
import pandas as pd
from config.database import get_connection

def render_dashboard():
    st.markdown("## Dashboard")
    
    conn = get_connection()
    
    # Metrics
    try:
        total_pos = conn.execute("SELECT COUNT(*) FROM purchase_orders").fetchone()[0]
        total_value = conn.execute("SELECT SUM(po_value) FROM purchase_orders").fetchone()[0] or 0
        total_dcs = conn.execute("SELECT COUNT(*) FROM delivery_challans").fetchone()[0]
        pending_items = conn.execute("SELECT COUNT(*) FROM purchase_order_items WHERE pending_qty > 0").fetchone()[0]
    except Exception as e:
        total_pos, total_value, total_dcs, pending_items = 0, 0, 0, 0
    
    # Compact Metrics Row
    col1, col2, col3, col4 = st.columns(4)
    col1.metric("PO Value", f"₹{total_value:,.0f}")
    col2.metric("POs", total_pos)
    col3.metric("Pending", pending_items)
    col4.metric("DCs", total_dcs)
    
    st.divider()
    
    # Quick Actions
    st.caption("**Quick Actions**")
    col1, col2, col3 = st.columns(3)
    with col1:
        if st.button("⬆ Upload PO", use_container_width=True, type="primary"):
            st.session_state.nav = "Purchase Orders"
            st.session_state.po_action = "list"
            st.rerun()
    with col2:
        if st.button("🚚 Create DC", use_container_width=True):
            st.session_state.nav = "Delivery Challans"
            st.rerun()
    with col3:
        if st.button("📊 Reports", use_container_width=True):
            st.session_state.nav = "Reports"
            st.rerun()
    
    st.divider()
    
    # Recent POs (Compact)
    st.caption("**Recent Orders**")
    
    recent_pos = conn.execute("""
        SELECT po_number, po_date, po_status, po_value
        FROM purchase_orders
        ORDER BY created_at DESC
        LIMIT 10
    """).fetchall()
    
    conn.close()
    
    if recent_pos:
        data = []
        for po in recent_pos:
            data.append({
                "PO": f"PO-{po[0]}",
                "Date": po[1],
                "Status": po[2] or "New",
                "Value": f"₹{po[3]:,.0f}" if po[3] else "-"
            })
        
        df = pd.DataFrame(data)
        st.dataframe(df, hide_index=True, use_container_width=True, height=350)
    else:
        st.info("No POs yet. Upload to get started.")
