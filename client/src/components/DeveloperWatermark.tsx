import { Code2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function DeveloperWatermark() {
  const { data: config } = useQuery({
    queryKey: ['/api/config'],
    queryFn: async () => {
      const response = await fetch('/api/config', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to load config');
      return response.json();
    },
  });

  return (
    <div className="fixed bottom-4 right-4 text-xs text-muted-foreground flex items-center gap-2 opacity-50 hover:opacity-100 transition-opacity">
      <Code2 className="w-3 h-3" />
      <div>
        <p className="font-medium">Developed by {config?.developer?.name || 'CIE Portal Development Team'}</p>
        <p>Contact: {config?.developer?.contact || 'developer@example.com'}</p>
      </div>
    </div>
  );
}
