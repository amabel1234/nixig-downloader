import { Download, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaItem } from "@workspace/api-client-react";
import { downloadFile } from "@/lib/download";

interface MediaCardProps {
  item: MediaItem;
  index: number;
}

export function MediaCard({ item, index }: MediaCardProps) {
  const isVideo = item.type === "video";
  const filename = `nixig-${isVideo ? "video" : "image"}-${index + 1}.${isVideo ? "mp4" : "jpg"}`;

  const handleDownload = () => {
    downloadFile(item.url, filename);
  };

  return (
    <div className="group relative overflow-hidden rounded-xl bg-muted/50 border border-border/50 aspect-[4/5] flex flex-col justify-between">
      {/* Background Media */}
      {isVideo ? (
        <div className="absolute inset-0 w-full h-full bg-black">
          {item.thumbnail ? (
            <img 
              src={item.thumbnail} 
              alt="Video thumbnail" 
              className="w-full h-full object-cover opacity-80"
              crossOrigin="anonymous"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900">
              <Play className="w-12 h-12 text-white/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
          <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md px-2 py-1 rounded-md text-xs font-medium text-white flex items-center gap-1.5">
            <Play className="w-3 h-3 fill-current" /> Video
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 w-full h-full bg-zinc-100 dark:bg-zinc-900">
          <img 
            src={item.url} 
            alt="Instagram media" 
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      )}

      {/* Hover/Action Overlay */}
      <div className="relative h-full flex flex-col justify-end p-4 z-10 opacity-100 sm:opacity-0 sm:translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
        <Button 
          onClick={handleDownload}
          className="w-full gap-2 shadow-lg shadow-black/20" 
          size="lg"
          data-testid={`button-download-media-${index}`}
        >
          <Download className="w-4 h-4" />
          Download {isVideo ? "Video" : "Image"}
        </Button>
      </div>
    </div>
  );
}
