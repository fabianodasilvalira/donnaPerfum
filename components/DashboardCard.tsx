
import React from 'react';

interface DashboardCardProps {
    icon: string;
    title: string;
    value: string | number;
    color: string;
    children?: React.ReactNode;
    tooltipText?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ icon, title, value, color, children, tooltipText }) => {
    const colorClasses = {
        purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        green: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
        red: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
        blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    };

    const bgColor = colorClasses[color as keyof typeof colorClasses] || colorClasses.purple;

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md flex flex-col justify-between hover:shadow-xl transition-shadow duration-300">
            <div>
              <div className="flex items-center justify-between">
                  <div className={`p-3 rounded-full ${bgColor}`}>
                      <span className="material-symbols-outlined text-3xl">{icon}</span>
                  </div>
                  <div className="flex items-center gap-1 text-right">
                    <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">{title}</h3>
                    {tooltipText && (
                        <div className="relative group flex items-center">
                            <span className="material-symbols-outlined text-gray-400 cursor-help text-base">info</span>
                            <div className="absolute bottom-full right-0 mb-2 w-60 p-3 text-sm font-normal text-left text-white bg-gray-900 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 dark:bg-gray-700">
                                {tooltipText}
                                <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-900 dark:border-t-gray-700"></div>
                            </div>
                        </div>
                    )}
                  </div>
              </div>
              <p className="text-4xl font-bold text-gray-800 dark:text-gray-100 mt-4">{value}</p>
            </div>
            {children && <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">{children}</div>}
        </div>
    );
};

export default DashboardCard;
