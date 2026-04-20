import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { LogOut, Trash2, PlusCircle, TrendingUp, AlertTriangle, Lightbulb, Settings } from 'lucide-react';

// Wastage logic calculation:
// Full -> 0% waste
// Half -> 50% waste
// Skipped -> 100% waste

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  
  const [menuItems, setMenuItems] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Lunch');
  const [loading, setLoading] = useState(true);

  // Fetch menu and feedback
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const menuSnap = await getDocs(query(collection(db, 'menu')));
        const menuData = menuSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        const fbSnap = await getDocs(query(collection(db, 'feedback')));
        const fbData = fbSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fallback dummy data if db is empty for UI demonstration
        if (menuData.length === 0 && fbData.length === 0) {
          setupMockData();
        } else {
          setMenuItems(menuData);
          setFeedback(fbData);
        }
      } catch (err) {
        console.error("Firebase error, using mock data", err);
        setupMockData();
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  const setupMockData = useCallback(() => {
    const mocMenu = [
      { id: '1', name: 'Paneer Butter Masala', category: 'Dinner' },
      { id: '2', name: 'Dal Roti', category: 'Lunch' },
      { id: '3', name: 'Aloo Paratha', category: 'Breakfast' },
    ];
    const mocFeedback = [
      { id: 'a', menuItemId: '1', portion: 'full', rating: 5, comment: 'Great' },
      { id: 'b', menuItemId: '1', portion: 'half', rating: 4, comment: 'Good' },
      { id: 'c', menuItemId: '2', portion: 'skipped', rating: 2, comment: 'Boring' },
      { id: 'd', menuItemId: '2', portion: 'half', rating: 3, comment: 'Okay' },
      { id: 'e', menuItemId: '3', portion: 'full', rating: 5, comment: 'Loved it' },
    ];
    setMenuItems(mocMenu);
    setFeedback(mocFeedback);
  }, []);

  // Admin Actions (CRUD for menu)
  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItemName) return;
    try {
      const docRef = await addDoc(collection(db, 'menu'), {
        name: newItemName,
        category: newItemCategory
      });
      setMenuItems([...menuItems, { id: docRef.id, name: newItemName, category: newItemCategory }]);
      setNewItemName('');
    } catch (error) {
      alert("Running in mock mode. Item added to local state.");
      setMenuItems([...menuItems, { id: Date.now().toString(), name: newItemName, category: newItemCategory }]);
      setNewItemName('');
    }
  };

  const handleDeleteItem = async (id) => {
    try {
      await deleteDoc(doc(db, 'menu', id));
      setMenuItems(menuItems.filter(item => item.id !== id));
    } catch (error) {
      setMenuItems(menuItems.filter(item => item.id !== id));
    }
  };

  // CONCEPT: useMemo (Complex analytics calculations)
  const analyticsData = useMemo(() => {
    if (!menuItems.length || !feedback.length) return {
      itemStats: [], totalWastePercent: 0, recommendations: []
    };

    let totalWasteScore = 0;
    let totalPortions = feedback.length;

    const itemStatsMap = {};

    feedback.forEach(fb => {
      if (!itemStatsMap[fb.menuItemId]) {
        itemStatsMap[fb.menuItemId] = { count: 0, ratingSum: 0, wasteScore: 0 };
      }
      
      const st = itemStatsMap[fb.menuItemId];
      st.count += 1;
      st.ratingSum += fb.rating;
      
      let waste = 0;
      if (fb.portion === 'half') waste = 50;
      if (fb.portion === 'skipped') waste = 100;
      
      st.wasteScore += waste;
      totalWasteScore += waste;
    });

    const itemStats = menuItems.map(item => {
      const st = itemStatsMap[item.id] || { count: 0, ratingSum: 0, wasteScore: 0 };
      const avgRating = st.count > 0 ? (st.ratingSum / st.count).toFixed(1) : 0;
      const avgWaste = st.count > 0 ? Math.round(st.wasteScore / st.count) : 0;
      return {
        ...item,
        avgRating: parseFloat(avgRating),
        avgWaste,
        feedbackCount: st.count
      };
    }).sort((a,b) => b.avgRating - a.avgRating); // sort by rating desc

    const totalWastePercent = totalPortions > 0 ? Math.round(totalWasteScore / totalPortions) : 0;

    // Smart Recommendations
    const recommendations = [];
    itemStats.forEach(item => {
      if (item.avgWaste >= 70 && item.avgRating < 3) {
        recommendations.push({ type: 'remove', text: `Consider replacing ${item.name} due to high waste (${item.avgWaste}%) and low ratings.`, item });
      } else if (item.avgRating >= 4.5 && item.avgWaste < 20) {
        recommendations.push({ type: 'increase', text: `${item.name} is highly requested. Consider increasing frequency.`, item });
      }
    });

    return { itemStats, totalWastePercent, recommendations };
  }, [menuItems, feedback]);

  const { itemStats, totalWastePercent, recommendations } = analyticsData;

  const COLORS = ['#22c55e', '#eab308', '#ef4444']; // Low, Med, High waste
  const pieData = [
    { name: 'Consumed', value: 100 - totalWastePercent },
    { name: 'Wasted', value: totalWastePercent },
  ];

  if (loading) return <div className="p-8 text-center">Loading dashboards...</div>;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      {/* Top Navbar */}
      <nav className="bg-gray-900 border-b border-gray-800 text-white sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <Settings className="h-6 w-6 text-primary-400" />
              <h1 className="text-xl font-bold tracking-tight">Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">{currentUser?.email}</span>
              <button onClick={logout} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
                <LogOut className="h-5 w-5 text-gray-400 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        
        {/* KPI Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className={`p-4 rounded-xl ${totalWastePercent > 50 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'} mr-4`}>
              <TrendingUp className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Food Wastage</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{totalWastePercent}%</h3>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center">
            <div className="p-4 rounded-xl bg-primary-50 text-primary-600 mr-4">
              <Lightbulb className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Feedbacks</p>
              <h3 className="text-3xl font-extrabold text-gray-900">{feedback.length}</h3>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
             <h3 className="text-gray-500 text-sm font-medium mb-3">Overall Waste Distribution</h3>
             <div className="h-20">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={pieData} dataKey="value" stroke="none" innerRadius={20} outerRadius={35}>
                      <Cell fill="#22c55e" />
                      <Cell fill="#ef4444" />
                   </Pie>
                   <RechartsTooltip />
                 </PieChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* Charts & smart suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">Food Performance Analysis</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={itemStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{fontSize: 12}} interval={0} angle={-30} textAnchor="end" />
                  <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ef4444" />
                  <RechartsTooltip cursor={{fill: '#f3f4f6'}} />
                  <Legend />
                  <Bar yAxisId="left" dataKey="avgRating" name="Avg Rating (Out of 5)" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="avgWaste" name="Wastage %" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Smart Suggestions */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
              AI Suggestions
            </h2>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              {recommendations.length > 0 ? recommendations.map((rec, idx) => (
                <div key={idx} className={`p-4 rounded-xl border ${rec.type === 'remove' ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <h4 className={`font-semibold text-sm ${rec.type === 'remove' ? 'text-red-800' : 'text-green-800'}`}>
                    {rec.item.name}
                  </h4>
                  <p className={`text-xs mt-1 ${rec.type === 'remove' ? 'text-red-600' : 'text-green-600'}`}>
                    {rec.text}
                  </p>
                </div>
              )) : (
                <div className="text-center py-8 text-gray-500 text-sm">
                  <Lightbulb className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  No critical suggestions yet. Gather more feedback.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Menu Manager */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
             <h2 className="text-lg font-bold text-gray-900">Menu Management</h2>
          </div>
          
          <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
             {/* Add Item Form */}
             <div className="lg:col-span-1">
               <form onSubmit={handleAddItem} className="space-y-4 bg-gray-50 p-5 rounded-xl border border-gray-100">
                 <h3 className="text-sm font-semibold text-gray-700">Add New Item</h3>
                 <div>
                   <input
                     type="text"
                     value={newItemName}
                     onChange={(e) => setNewItemName(e.target.value)}
                     placeholder="Item Name (e.g. Rajma)"
                     className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                     required
                   />
                 </div>
                 <div>
                   <select 
                     value={newItemCategory}
                     onChange={(e) => setNewItemCategory(e.target.value)}
                     className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                   >
                     <option>Breakfast</option>
                     <option>Lunch</option>
                     <option>Dinner</option>
                     <option>Snacks</option>
                   </select>
                 </div>
                 <button type="submit" className="w-full bg-primary-600 text-white font-medium py-2 rounded-lg hover:bg-primary-700 transition flex justify-center items-center">
                   <PlusCircle className="h-4 w-4 mr-2" /> Add to Menu
                 </button>
               </form>
             </div>

             {/* Items List */}
             <div className="lg:col-span-2">
               <div className="overflow-x-auto">
                 <table className="min-w-full divide-y divide-gray-200">
                   <thead>
                     <tr>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                       <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                       <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Rating</th>
                       <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Waste %</th>
                       <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                     </tr>
                   </thead>
                   <tbody className="bg-white divide-y divide-gray-100">
                     {itemStats.map(item => (
                       <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                         <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                           <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">{item.category}</span>
                         </td>
                         <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                           <span className="flex items-center justify-center font-medium bg-yellow-50 text-yellow-700 px-2 py-1 rounded-full">
                             {item.avgRating} <Star className="h-3 w-3 ml-1 fill-current" />
                           </span>
                         </td>
                         <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                           <span className={`font-semibold ${item.avgWaste > 50 ? 'text-red-600' : 'text-green-600'}`}>
                             {item.avgWaste}%
                           </span>
                         </td>
                         <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                           <button 
                             onClick={() => handleDeleteItem(item.id)}
                             className="text-red-400 hover:text-red-600 transition-colors bg-red-50 p-2 rounded-lg"
                             title="Remove Item"
                           >
                             <Trash2 className="h-4 w-4" />
                           </button>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
