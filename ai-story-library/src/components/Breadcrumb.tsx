import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  name: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex flex-wrap items-center text-xs md:text-sm text-white/50 mb-6 font-medium">
      <Link href="/" className="hover:text-accent transition-colors flex items-center">
        <Home className="w-3.5 h-3.5 mr-1" />
        ホーム
      </Link>
      {items.map((item, index) => (
        <div key={index} className="flex items-center whitespace-nowrap">
          <ChevronRight className="w-3.5 h-3.5 mx-2 text-white/30" />
          {item.href ? (
            <Link href={item.href} className="hover:text-accent transition-colors">
              {item.name}
            </Link>
          ) : (
            <span className="text-white/90">{item.name}</span>
          )}
        </div>
      ))}
    </nav>
  );
}
