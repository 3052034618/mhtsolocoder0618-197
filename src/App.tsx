import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import Dashboard from '@/pages/Dashboard'
import Orders from '@/pages/Orders'
import NewOrder from '@/pages/Orders/NewOrder'
import OrderDetail from '@/pages/Orders/OrderDetail'
import Customers from '@/pages/Customers'
import CustomerDetail from '@/pages/Customers/CustomerDetail'
import Finance from '@/pages/Finance'
import Report from '@/pages/Finance/Report'
import Trips from '@/pages/Trips'
import Settings from '@/pages/Settings'
import Track from '@/pages/Track'

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/track/:token" element={<Track />} />
        <Route
          path="/*"
          element={
            <Sidebar>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/new" element={<NewOrder />} />
                <Route path="/orders/:id" element={<OrderDetail />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/customers/:id" element={<CustomerDetail />} />
                <Route path="/finance" element={<Finance />} />
                <Route path="/finance/report" element={<Report />} />
                <Route path="/trips" element={<Trips />} />
                <Route path="/trips/:id" element={<Trips />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Sidebar>
          }
        />
      </Routes>
    </Router>
  )
}
