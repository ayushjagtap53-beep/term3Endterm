import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '../firebase/config';
import { collection, query, getDocs, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { LogOut, Star, Utensils, MessageSquare, CheckCircle, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

// CONCEPT: Component Composition (Reusable Menu Card)
const MenuItemCard = ({ item, onSubmitFeedback, hasSubmitted }) => {
  const [rating, setRating] = useState(3);
  const [comment, setComment] = useState('');
  const [portion, setPortion] = useState('full');
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitFeedback(item.id, { rating, comment, portion });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{item.name}</h3>
            <span className="inline-block mt-1 px-3 py-1 bg-primary-50 text-primary-700 text-xs font-semibold rounded-full">
              {item.category || 'Main Course'}
            </span>
          </div>
          <Utensils className="text-gray-300 h-8 w-8" />
        </div>

        {hasSubmitted ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-xl flex items-center justify-center mt-4">
            <CheckCircle className="mr-2 h-5 w-5" />
            <span className="font-medium">Feedback recorded! Thank you.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Rating */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">How was it?</label>
              <div className="flex space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="focus:outline-none transition-transform hover:scale-110"
                  >
                    <Star
                      className={`h-8 w-8 ${
                        star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Portion Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Portion Consumed</label>
              <div className="grid grid-cols-3 gap-3">
                {['full', 'half', 'skipped'].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setPortion(opt)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium capitalize border transition-all ${
                      portion === opt 
                        ? 'bg-primary-50 border-primary-500 text-primary-700 ring-1 ring-primary-500' 
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Additional Comments</label>
              <div className="relative">
                <MessageSquare className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-primary-500 focus:border-primary-500 text-sm"
                  rows="2"
                  placeholder="Too salty? Perfectly cooked?"
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gray-900 text-white font-semibold py-3 rounded-xl hover:bg-gray-800 transition-colors shadow-md"
            >
              Submit Feedback
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
};

const StudentDashboard = () => {
  const { currentUser, logout } = useAuth();
  
  // CONCEPT: useState
  const [menuItems, setMenuItems] = useState([]);
  const [submittedItems, setSubmittedItems] = useState(new Set());
  const [loading, setLoading] = useState(true);

  // CONCEPT: useEffect (Fetching data)
  useEffect(() => {
    const fetchMenuAndFeedbackState = async () => {
      try {
        // In a real app, query by today's date using where('date', '==', today)
        const menuQuery = query(collection(db, 'menu'));
        const querySnapshot = await getDocs(menuQuery);
        const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // Also fetch user's feedback to disable already submitted ones
        const feedbackQuery = query(collection(db, 'feedback'), where('userId', '==', currentUser.uid));
        const fbSnapshot = await getDocs(feedbackQuery);
        const submitted = new Set(fbSnapshot.docs.map(doc => doc.data().menuItemId));
        
        // Use Mock data if database is empty for demo purposes
        if (items.length === 0) {
          const mockup = [
            { id: '1', name: 'Paneer Butter Masala', category: 'Dinner' },
            { id: '2', name: 'Dal Roti', category: 'Lunch' },
            { id: '3', name: 'Aloo Paratha', category: 'Breakfast' },
          ];
          setMenuItems(mockup);
        } else {
          setMenuItems(items);
        }
        
        setSubmittedItems(submitted);
      } catch (error) {
        console.error("Error fetching menu:", error);
        // Fallback for mock environment
        setMenuItems([
          { id: '1', name: 'Paneer Butter Masala', category: 'Dinner (Mock)' },
          { id: '2', name: 'Dal Roti', category: 'Lunch (Mock)' },
        ]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMenuAndFeedbackState();
  }, [currentUser.uid]);

  // CONCEPT: useCallback (Prevent unnecessary re-renders of child components)
  const handleFeedbackSubmit = useCallback(async (menuItemId, feedbackData) => {
    try {
      await addDoc(collection(db, 'feedback'), {
        menuItemId,
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        ...feedbackData
      });
      // Update local state to show success mark
      setSubmittedItems(prev => {
        const newSet = new Set(prev);
        newSet.add(menuItemId);
        return newSet;
      });
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      alert("Note: Running in mock mode, Firebase not configured. Update local UI state.");
      setSubmittedItems(prev => new Set(prev).add(menuItemId));
    }
  }, [currentUser.uid]);

  // CONCEPT: useMemo (Calculate completion percentage)
  const completionStats = useMemo(() => {
    if (menuItems.length === 0) return 0;
    return Math.round((submittedItems.size / menuItems.length) * 100);
  }, [menuItems.length, submittedItems.size]);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 font-sans pb-12">
      {/* Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-primary-500 rounded-lg p-2 mr-3">
                <Navigation className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">Student Portal</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex text-sm text-gray-500 font-medium">
                {currentUser.email}
              </div>
              <button 
                onClick={logout}
                className="text-gray-500 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-gray-100"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Today's Menu</h2>
            <p className="mt-1 text-gray-500">Provide feedback to help reduce food wastage.</p>
          </div>
          
          <div className="mt-4 md:mt-0 flex items-center bg-primary-50 rounded-xl px-4 py-3 border border-primary-100">
            <div className="mr-4">
              <div className="text-sm font-medium text-primary-800">Completion</div>
              <div className="text-2xl font-bold text-primary-600">{completionStats}%</div>
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-primary-200 flex items-center justify-center relative">
              {/* Circular progress simulated */}
              <svg className="absolute top-0 left-0 w-full h-full transform -rotate-90">
                <circle cx="28" cy="28" r="26" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-primary-100"/>
                <circle cx="28" cy="28" r="26" fill="transparent" stroke="currentColor" strokeWidth="4" className="text-primary-500" strokeDasharray="163" strokeDashoffset={163 - (163 * completionStats / 100)}/>
              </svg>
            </div>
          </div>
        </div>

        {/* CONCEPT: Lists & Keys */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map(item => (
            <MenuItemCard 
              key={item.id} 
              item={item} 
              onSubmitFeedback={handleFeedbackSubmit}
              hasSubmitted={submittedItems.has(item.id)}
            />
          ))}
          {menuItems.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl">
              <Utensils className="mx-auto h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium text-gray-900">No menu items found</h3>
              <p className="text-gray-500">Check back later for today's menu.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
