def get_recent_orders(user_id: str) :
    return [
        {
            "order_id": "123456",
            "item_name": "Laptop",
            "order_date": "2024-01-01",
            "order_total": 800.00
        },
        {
            "order_id": "123457",
            "item_name": "Mouse",
            "order_date": "2024-01-02",
            "order_total": 100.00
        },
        {
            "order_id": "123458",
            "item_name": "Keyboard",
            "order_date": "2024-01-02",
            "order_total": 50.00
        }
    ]

def get_delivery_status(order_id: str) :

    return {
        "order_id": order_id,
        "order_status": "Shipped",
        "order_date": "2024-01-02",
        "order_total": 50.00
    }