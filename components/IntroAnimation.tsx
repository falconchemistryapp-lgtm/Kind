const IntroAnimation = () => {
    // A selection of element symbols for the background shower, reduced for less clutter on mobile
    const bgElements = ['H', 'He', 'Li', 'Be', 'B', 'N', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar', 'K', 'Ca', 'Ti', 'V', 'Mn', 'Fe', 'Ni', 'Cu', 'Zn'];

    return (
        <div className="w-screen h-screen bg-[var(--bg-primary)] flex justify-center items-center overflow-hidden font-display">
            <div className="relative w-full max-w-lg px-4 h-[300px] flex justify-center items-center intro-container-tiles">
                {/* Background falling tiles */}
                {bgElements.map((symbol, i) => (
                    <div 
                        key={i} 
                        className="intro-tile" 
                        style={{ 
                            left: `${Math.random() * 100}%`, 
                            animationDelay: `${Math.random() * 2}s`,
                            animationDuration: `${2 + Math.random() * 2}s`,
                         }}
                    >
                        {symbol}
                    </div>
                ))}

                {/* Main C and O tiles */}
                <div className="intro-tile tile-c">C</div>
                <div className="intro-tile tile-o">O</div>
                
                {/* Final text logo */}
                <h1 className="text-5xl sm:text-7xl text-center relative z-10 intro-logo-text">
                    <span className="font-bold">CO</span>
                    <span className="text-[var(--accent-teal)]">/</span>
                    <span className="font-light">CHEMISTRY</span>
                </h1>
            </div>
        </div>
    );
};

export default IntroAnimation;