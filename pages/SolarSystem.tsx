import React from 'react';
import { X } from 'lucide-react';

const SolarSystemPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#2D1B69] text-white p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <X className="w-6 h-6" />
      </div>
      <h1 className="text-4xl font-bold mb-8">Solar<br />System</h1>
      
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white/10 p-4 rounded-2xl h-32"></div>
        <div className="bg-white p-4 rounded-2xl h-32 flex flex-col justify-end">
            <div className="w-12 h-12 bg-orange-200 rounded-full mb-2"></div>
            <p className="text-black font-bold">Saturn</p>
        </div>
        <div className="bg-blue-500 p-4 rounded-2xl h-32"></div>
        <div className="bg-yellow-400 p-4 rounded-2xl h-32"></div>
      </div>
      
      <button className="w-full bg-white text-[#2D1B69] py-4 rounded-2xl font-bold text-lg">
        To infinity
      </button>
      <p className="text-center mt-2 text-white/70">and beyond</p>
    </div>
  );
};

export default SolarSystemPage;
