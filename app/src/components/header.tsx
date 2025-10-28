'use client';

export default function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b-0 bg-transparent px-4 backdrop-blur-sm sm:px-6">
      <div className="flex items-center gap-2">
         <AnanHealthLogo />
        <span className="text-xl font-bold font-headline text-primary-foreground">
          ANAN Health
        </span>
      </div>
    </header>
  );
}


function AnanHealthLogo() {
    return (
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5.33301 13.3333H26.6663V26.6667C26.6663 28.1333 25.4663 29.3333 23.9997 29.3333H7.99967C6.53301 29.3333 5.33301 28.1333 5.33301 26.6667V13.3333Z"
            fill="#E0F2F2"
          />
          <path
            d="M26.667 8C26.667 9.46667 25.467 10.6667 24.0003 10.6667H8.00033C6.53366 10.6667 5.33366 9.46667 5.33366 8V5.33333C5.33366 3.86667 6.53366 2.66667 8.00033 2.66667H24.0003C25.467 2.66667 26.667 3.86667 26.667 5.33333V8Z"
            fill="#E0F2F2"
          />
          <path
            d="M16 17.3333V25.3333"
            stroke="#14B8A6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M20 19.3333L16 25.3333L12 19.3333"
            stroke="#14B8A6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
    )
}
