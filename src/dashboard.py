import streamlit as st
import pandas as pd
from config.database import get_connection

def render_dashboard():
    st.markdown("## Dashboard")
    
    conn = get_connection()
    
    # Real metrics from database
    total_pos = conn.execute("SELECT COUNT(*) FROM purchase_orders").fetchone()[0]
    total_value = conn.execute("SELECT SUM(po_value) FROM purchase_orders").fetchone()[0] or 0
    total_dcs = conn.execute("SELECT COUNT(*) FROM delivery_challans").fetchone()[0]
    pending_items = conn.execute("SELECT COUNT(*) FROM purchase_order_items WHERE pending_qty > 0").fetchone()[0]
    
    # Metrics Cards
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown(f"""
        <div class="card">
            <div class="metric-label">Total PO Value</div>
            <div class="metric-value">₹{total_value:,.0f}</div>
        </div>
        """, unsafe_allow_html=True)
        
    with col2:
        st.markdown(f"""
        <div class="card">
             <div class="metric-label">Purchase Orders</div>
             <div class="metric-value">{total_pos}</div>
        </div>
        """, unsafe_allow_html=True)

    with col3:
        st.markdown(f"""
        <div class="card">
             <div class="metric-label">Pending Items</div>
             <div class="metric-value">{pending_items}</div>
        </div>
        """, unsafe_allow_html=True)

    with col4:
        st.markdown(f"""
        <div class="card">
             <div class="metric-label">Delivery Challans</div>
             <div class="metric-value">{total_dcs}</div>
        </div>
        """, unsafe_allow_html=True)

    
    st.markdown("---")
    
    # Recent Purchase Orders
    st.markdown("### Recent Purchase Orders")
    
    recent_pos = conn.execute("""
        SELECT po_number, po_date, supplier_name, po_value
        FROM purchase_orders
        ORDER BY created_at DESC
        LIMIT 5
    """).fetchall()
    
    conn.close()
    
    if recent_pos:
        df = pd.DataFrame(recent_pos, columns=['PO Number', 'Date', 'Supplier', 'Value'])
        df['PO Number'] = 'PO-' + df['PO Number'].astype(str)
        df['Value'] = df['Value'].apply(lambda x: f"₹{x:,.2f}" if x else "-")
        
        st.dataframe(
            df,
            hide_index=True,
            use_container_width=True
        )
    else:
        st.info("No purchase orders found. Upload PO files to get started.")
