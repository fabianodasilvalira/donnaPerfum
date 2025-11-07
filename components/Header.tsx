import React from 'react';

interface HeaderProps {
    onMenuClick: () => void;
    pageTitle: string;
    themeColor: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, pageTitle, themeColor }) => {
    
    const isWhiteTheme = themeColor === 'white';

    const headerTextColor = isWhiteTheme ? 'text-gray-800' : 'text-white';
    const mobileHeaderTextColor = isWhiteTheme ? 'text-gray-800' : 'text-white';
    const headerBorderColor = isWhiteTheme ? 'border-gray-200' : 'border-white/10';
    const emailTextColor = isWhiteTheme ? 'text-gray-500' : 'text-primary-100';
    const avatarBgColor = isWhiteTheme ? 'bg-gray-100' : 'bg-black/20';
    const avatarIconColor = isWhiteTheme ? 'text-gray-700' : 'text-white';

    return (
        <>
            {/* Mobile Header */}
            <header className={`lg:hidden h-20 px-4 flex items-center justify-between bg-primary-600 shadow-md sticky top-0 z-20`}>
                <div className={`flex items-center ${mobileHeaderTextColor}`}>
                    <span className="material-symbols-outlined text-3xl">storefront</span>
                    <h1 className="text-xl font-bold ml-2">Donna Parfum</h1>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={onMenuClick} className={mobileHeaderTextColor}>
                        <span className="material-symbols-outlined text-3xl">menu</span>
                    </button>
                </div>
            </header>

            {/* Desktop Header */}
            <header className={`hidden lg:flex bg-primary-600 ${headerTextColor} h-20 px-8 items-center justify-between border-b ${headerBorderColor} sticky top-0 z-20`}>
                <h1 className="text-3xl font-bold">{pageTitle}</h1>
                <div className="flex items-center gap-4">
                    <div className="text-right">
                        <p className="font-semibold">Admin</p>
                        <p className={`text-xs ${emailTextColor}`}>admin@sistema.com</p>
                    </div>
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${avatarBgColor}`}>
                        <span className={`material-symbols-outlined text-3xl ${avatarIconColor}`}>
                            person
                        </span>
                    </div>
                    <button 
                        onClick={() => alert('Funcionalidade de logout a ser implementada.')} 
                        className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                        title="Sair"
                    >
                        <span className="material-symbols-outlined">logout</span>
                    </button>
                </div>
            </header>
        </>
    );
};

export default Header;