// FIX: Import React to use React.ReactNode type.
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { getChapterTopics, startChatSession, continueChatStream, ChatSession } from './services/geminiService';
import { CHEMISTRY_SUBJECT, STANDARDS, CHAPTERS } from './constants';
import { Spinner, ErrorDisplay, Footer } from './components/common';
import TopicContent from './components/TopicContent';
import PeriodicTable from './components/PeriodicTable';
import ReactionPredictor from './components/ReactionPredictor';
import Numericals from './components/Numericals';
import ChatBox, { ChatMessage } from './components/ChatBox';
import FeedbackModal from './components/FeedbackModal';
import UnitTest from './components/UnitTest';
import IntroAnimation from './components/IntroAnimation';

// --- SVG Icons ---
const IconGetStarted = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>);
const IconTools = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" /></svg>);
const IconTopics = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75h16.5m-16.5 3.75h16.5M3.75 17.25h16.5" /></svg>);
const IconSun = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.364l-1.591 1.591M21 12h-2.25m-.364 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>);
const IconMoon = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" /></svg>);
const IconPredictor = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>);
const IconNumericals = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="10" fontFamily="sans-serif" fontWeight="bold">H<tspan dy="3" fontSize="7">2</tspan><tspan dy="-3">O</tspan></text></svg>);
const IconUnitTest = () => (<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fontFamily="sans-serif" fontWeight="bold">Q&amp;A</text></svg>);
const IconPlayground = () => (<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5v.214a2.25 2.25 0 0 1-1.125 1.946l-2.073 1.036-2.073-1.036A2.25 2.25 0 0 1 9.75 14.714v-.214M5 14.5v.214a2.25 2.25 0 0 0 1.125 1.946l2.073 1.036 2.073-1.036A2.25 2.25 0 0 0 14.25 14.714v-.214m-9.25 0h14.5" /></svg>);

// FIX: Added props interface for ToolsSidebar for better type safety.
interface ToolsSidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    onToolSelect: (toolKey: string) => void;
    tools: { key: string; icon: React.ReactNode; disabled: boolean }[];
    theme: 'light' | 'dark';
    toggleTheme: () => void;
}

const ToolsSidebar = ({ isOpen, setIsOpen, onToolSelect, tools, theme, toggleTheme }: ToolsSidebarProps) => {
    return (
      <>
        <div 
          className={`fixed inset-0 bg-black/40 z-20 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
          onClick={() => setIsOpen(false)} 
        />
        
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="tools-sidebar-trigger glass-pane"
          aria-label={isOpen ? 'Close Tools Sidebar' : 'Open Tools Sidebar'}
          aria-expanded={isOpen}
        >
          <IconTools/>
          <span>Tools</span>
        </button>
  
        <aside className={`tools-sidebar glass-pane ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          {/* Header */}
          <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[var(--border-primary)]">
            <h2 className="card-title !m-0"><IconTools/> Tools</h2>
            <button onClick={() => setIsOpen(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          
          {/* Main Content (Scrollable) */}
          <nav className="flex-grow p-4 overflow-y-auto custom-scrollbar">
            <ul className="space-y-2">
              {tools.map(tool => (
                <li key={tool.key}>
                  <button 
                    onClick={() => { onToolSelect(tool.key); setIsOpen(false); }} 
                    disabled={tool.disabled} 
                    className="sidebar-tool-button"
                  >
                    <span className="sidebar-tool-icon">{tool.icon}</span>
                    <span>{tool.key}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer (Theme Toggle) */}
          <div className="flex-shrink-0 p-4 border-t border-[var(--border-primary)]">
                <button onClick={toggleTheme} className="sidebar-theme-toggle-button" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}>
                    {theme === 'light' ? <IconMoon /> : <IconSun />}
                    <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                </button>
          </div>
        </aside>
      </>
    );
};

interface DashboardProps {
    standard: string;
    setStandard: (value: string) => void;
    chapter: string;
    setChapter: (value: string) => void;
    topics: string[];
    isLoading: boolean;
    isLoadingTopics: boolean;
    error: string | null;
    fetchTopics: (currentTopics?: string[]) => void;
    handleTopicSelect: (topic: string) => void;
    // FIX: Replaced JSX.Element with React.ReactNode to resolve the 'Cannot find namespace JSX' error.
    tools: { key: string; icon: React.ReactNode; disabled: boolean }[];
}

const Dashboard = ({
    standard, setStandard, chapter, setChapter, topics,
    isLoading, isLoadingTopics, error, fetchTopics,
    handleTopicSelect, tools
}: DashboardProps) => (
    <div className="p-4 sm:p-6 lg:p-8 w-full">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 mb-8 animate-fade-in">
            <div className="flex items-center gap-4">
                <div className="sidebar-logo loading">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor"/>
                    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" stroke="currentColor"/>
                    <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" stroke="currentColor"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
                </div>
                <div>
                    <h1 className="sidebar-title text-4xl">
                        CO<span className="text-[var(--accent-teal)]">/</span><span className="font-light">CHEMISTRY</span>
                    </h1>
                    <p className="text-[var(--text-secondary)]">Interactive Study Aid</p>
                </div>
            </div>
        </header>

        {/* Dashboard Content */}
        <div className="flex flex-col gap-6">
            {/* Top row: Setup and Topics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Setup Card */}
                <div className="dashboard-card glass-pane md:col-span-1" style={{ animationDelay: '0.1s' }}>
                    <h2 className="card-title"><IconGetStarted /> Get Started</h2>
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="standard" className="card-label">Standard</label>
                            <select id="standard" value={standard} onChange={e => setStandard(e.target.value)} className="dashboard-select">
                                <option value="" disabled>Select Standard...</option>
                                {STANDARDS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="chapter" className="card-label">Chapter</label>
                            <select id="chapter" value={chapter} onChange={e => setChapter(e.target.value)} className="dashboard-select" disabled={!standard}>
                                <option value="" disabled>Select Chapter...</option>
                                {standard && CHAPTERS[CHEMISTRY_SUBJECT][standard].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Topics Card */}
                <div className="dashboard-card glass-pane md:col-span-2" style={{ animationDelay: '0.2s' }}>
                    <h2 className="card-title"><IconTopics/> Topics for "{chapter || '...'}"</h2>
                    <div className="mt-4 h-64 overflow-y-auto pr-2 custom-scrollbar relative">
                        {isLoadingTopics && (
                            <div className="absolute inset-0 bg-[var(--bg-secondary)] bg-opacity-70 flex justify-center items-center z-10 rounded-lg">
                                <Spinner />
                            </div>
                        )}
                        {error && <ErrorDisplay message={error} onRetry={() => fetchTopics()} />}
                        
                        {chapter ? (
                        <>
                            <ul className="space-y-1">
                                {topics.map(topic => (
                                <li key={topic}>
                                    <button onClick={() => handleTopicSelect(topic)} className="topic-button">
                                        <span>{topic}</span>
                                    </button>
                                </li>
                                ))}
                            </ul>
                            {!error && topics.length > 0 && (
                                <div className="text-center mt-4">
                                    <button
                                        onClick={() => fetchTopics(topics)}
                                        disabled={isLoading}
                                        className="glowing-button text-sm !p-2 !px-4"
                                    >
                                        {isLoading ? 'Loading...' : 'Load More Topics'}
                                    </button>
                                </div>
                            )}
                        </>
                        ) : (
                            <div className="flex items-center justify-center h-full text-center text-[var(--text-muted)]">
                                <p>Please select a standard and chapter to see the topics.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom row: Quick Tools */}
            <div className="dashboard-card glass-pane" style={{ animationDelay: '0.3s' }}>
                <h2 className="card-title"><IconTools /> Quick Access Tools</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                    {tools.map(tool => (
                        <button
                            key={tool.key}
                            disabled={tool.disabled}
                            onClick={() => handleTopicSelect(tool.key)}
                            className="dashboard-tool-button"
                        >
                            <div className="dashboard-tool-icon">{tool.icon}</div>
                            <span>{tool.key}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    </div>
);

interface ContentViewProps {
    handleBackToDashboard: () => void;
    selectedTopic: string | null;
    chapter: string | null;
    standard: string | null;
    resetPlaygroundTrigger: number;
}

const ContentView = ({ handleBackToDashboard, selectedTopic, chapter, standard, resetPlaygroundTrigger }: ContentViewProps) => (
    <div className="p-4 sm:p-6 w-full flex flex-col h-full">
        <div className="flex-shrink-0 mb-4">
             <button onClick={handleBackToDashboard} className="glowing-button mb-4">
                &larr; Back to Dashboard
            </button>
        </div>
        <main className="flex-grow glass-pane p-4 sm:p-6 overflow-hidden">
            {selectedTopic ? (
                selectedTopic === "Reaction Playground" ? (
                    <PeriodicTable resetTrigger={resetPlaygroundTrigger} />
                ) : selectedTopic === "Reaction Predictor" ? (
                    <ReactionPredictor />
                ) : selectedTopic === "Numericals" ? (
                    <Numericals 
                        chapter={chapter!}
                        standard={standard!}
                        subject={CHEMISTRY_SUBJECT}
                    />
                ) : selectedTopic === "Unit Test" ? (
                     <UnitTest 
                        chapter={chapter!}
                        standard={standard!}
                        subject={CHEMISTRY_SUBJECT}
                    />
                ) : (
                    <TopicContent 
                        topic={selectedTopic}
                        chapter={chapter}
                        standard={standard}
                        subject={CHEMISTRY_SUBJECT}
                    />
                )
            ) : (
            <div className="flex justify-center items-center h-full">
                <div className="text-center">
                <h2 className="text-3xl font-bold text-[var(--text-secondary)]">Content Area</h2>
                <p className="text-[var(--text-muted)]">Something went wrong. Please go back to the dashboard.</p>
                </div>
            </div>
            )}
        </main>
    </div>
);


const App = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [standard, setStandard] = useState('');
  const [chapter, setChapter] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [resetPlaygroundTrigger, setResetPlaygroundTrigger] = useState(0);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [view, setView] = useState<'dashboard' | 'content'>('dashboard');
  const [isToolsSidebarOpen, setIsToolsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Chat state
  const [chatSession, setChatSession] = useState<ChatSession | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShowIntro(false), 4800); // Duration of the intro animation
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (theme === 'light') {
        document.documentElement.classList.add('light-theme');
    } else {
        document.documentElement.classList.remove('light-theme');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const fetchTopics = async (currentTopics: string[] = []) => {
    if (!chapter || !standard) return;
    
    setIsLoading(true); // For 'load more' button
    if (currentTopics.length === 0) {
        setIsLoadingTopics(true); // For overlay spinner
    }
    setError(null);

    try {
        const newTopics = await getChapterTopics(chapter, standard, CHEMISTRY_SUBJECT, currentTopics);
        if (currentTopics.length === 0) {
            setTopics(newTopics); // Replace topics
        } else {
            setTopics([...currentTopics, ...newTopics]); // Append topics
        }
    } catch (e: any) {
        setError(e.message || "An unknown error occurred.");
        if (currentTopics.length === 0) {
            setTopics([]); // On error, clear topics if it was a fresh fetch
        }
    } finally {
        setIsLoading(false);
        if (currentTopics.length === 0) {
            setIsLoadingTopics(false);
        }
    }
  };
  
  useEffect(() => {
    setChapter('');
    setTopics([]);
    setSelectedTopic(null);
  }, [standard]);
  
  useEffect(() => {
    setSelectedTopic(null);
    if (chapter) {
        fetchTopics();
    } else {
        setTopics([]); // Clear topics only if chapter is cleared
    }
  }, [chapter]);

  useEffect(() => {
    if (chapter && standard) {
        try {
            const session = startChatSession(standard, chapter);
            setChatSession(session);
            setChatHistory([
                { role: 'model', text: `Hi! I'm your tutor for **${chapter}**. Feel free to ask me anything about this chapter!` }
            ]);
            setIsChatLoading(false);
        } catch (e: any) {
            console.error(e);
            setChatHistory([{ role: 'model', text: 'Sorry, the chat tutor failed to initialize. Please try refreshing.' }]);
        }
    } else {
        setChatSession(null);
        setChatHistory([]);
    }
  }, [chapter, standard]);

  const handleSendMessage = async (message: string) => {
    if (!chatSession || isChatLoading) return;

    setIsChatLoading(true);
    const updatedHistory: ChatMessage[] = [...chatHistory, { role: 'user', text: message }];
    setChatHistory(updatedHistory);

    try {
        const responseStream = await continueChatStream(chatSession, message);
        
        setChatHistory(prev => [...prev, { role: 'model', text: '' }]);

        for await (const chunk of responseStream) {
            const chunkText = chunk.text;
            if (chunkText) {
                setChatHistory(prev => {
                    const newHistory = [...prev];
                    const lastMessage = newHistory[newHistory.length - 1];
                    if (lastMessage.role === 'model') {
                        lastMessage.text += chunkText;
                    }
                    return newHistory;
                });
            }
        }
    } catch (e: any) {
        const errorMessage = `Sorry, something went wrong: ${e instanceof Error ? e.message : 'Unknown error'}`;
        setChatHistory(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage?.role === 'model' && lastMessage.text === '') {
                const newHistory = [...prev.slice(0, -1)];
                return [...newHistory, { role: 'model', text: errorMessage }];
            }
            return [...prev, { role: 'model', text: errorMessage }];
        });
    } finally {
        setIsChatLoading(false);
    }
  };

  const handleTopicSelect = (topic: string) => {
    setSelectedTopic(topic);
    setView('content');
    setResetPlaygroundTrigger(c => c + 1); // Also reset playground when selected from dash
  };

  const handleBackToDashboard = () => {
    setSelectedTopic(null);
    setView('dashboard');
  };

  const tools = [
    { key: "Reaction Predictor", icon: <IconPredictor />, disabled: false },
    { key: "Numericals", icon: <IconNumericals />, disabled: !chapter },
    { key: "Unit Test", icon: <IconUnitTest />, disabled: !chapter },
    { key: "Reaction Playground", icon: <IconPlayground />, disabled: false }
  ];

  if (showIntro) {
    return <IntroAnimation />;
  }

  return (
    <div className="h-full w-full relative flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="flex-grow min-h-0 overflow-y-auto custom-scrollbar z-10">
         {view === 'dashboard' ? 
            <Dashboard 
                standard={standard}
                setStandard={setStandard}
                chapter={chapter}
                setChapter={setChapter}
                topics={topics}
                isLoading={isLoading}
                isLoadingTopics={isLoadingTopics}
                error={error}
                fetchTopics={fetchTopics}
                handleTopicSelect={handleTopicSelect}
                tools={tools}
            /> : 
            <ContentView 
                handleBackToDashboard={handleBackToDashboard}
                selectedTopic={selectedTopic}
                chapter={chapter}
                standard={standard}
                resetPlaygroundTrigger={resetPlaygroundTrigger}
            />
        }
      </div>
      
      <div className="flex-shrink-0 z-10">
        <Footer onShareFeedbackClick={() => setIsFeedbackModalOpen(true)} />
      </div>

      <ToolsSidebar 
        isOpen={isToolsSidebarOpen}
        setIsOpen={setIsToolsSidebarOpen}
        onToolSelect={handleTopicSelect}
        tools={tools}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      <ChatBox 
        chatHistory={chatHistory}
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
        isOpen={isChatOpen}
        setIsOpen={setIsChatOpen}
        chapter={chapter}
      />
      
      <FeedbackModal 
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);