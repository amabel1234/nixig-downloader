import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useDownloadMedia, DownloadResult } from "@workspace/api-client-react";
import { Link2, Loader2, AlertCircle, Instagram } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { MediaCard } from "@/components/media-card";

const formSchema = z.object({
  url: z.string().url({ message: "Please enter a valid URL." }).refine(
    (url) => url.includes("instagram.com"),
    { message: "Must be a valid Instagram URL." }
  ),
});

export default function Home() {
  const [result, setResult] = useState<DownloadResult | null>(null);
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const downloadMutation = useDownloadMedia();

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setResult(null);
    downloadMutation.mutate(
      { data: { url: values.url } },
      {
        onSuccess: (data) => {
          setResult(data);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center pt-24 pb-12 px-4 sm:px-6">
      
      {/* Header */}
      <div className="w-full max-w-2xl text-center space-y-4 mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 via-primary to-purple-600 shadow-xl shadow-primary/20 mb-4">
          <Instagram className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Nix Ig Downloader
        </h1>
        <p className="text-lg text-muted-foreground max-w-lg mx-auto">
          Paste an Instagram post, reel, or story URL to instantly download full-quality media. No login required.
        </p>
      </div>

      {/* Input Form */}
      <div className="w-full max-w-2xl mb-12">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <div className="relative flex items-center shadow-sm rounded-xl overflow-hidden bg-card border border-border focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
                    <div className="pl-4 pr-2 text-muted-foreground">
                      <Link2 className="w-5 h-5" />
                    </div>
                    <FormControl>
                      <Input 
                        placeholder="https://www.instagram.com/p/..." 
                        className="border-0 bg-transparent shadow-none focus-visible:ring-0 px-2 h-14 text-base placeholder:text-muted-foreground/60"
                        data-testid="input-instagram-url"
                        {...field} 
                      />
                    </FormControl>
                    <div className="pr-2">
                      <Button 
                        type="submit" 
                        disabled={downloadMutation.isPending}
                        className="h-10 px-6 font-semibold rounded-lg"
                        data-testid="button-submit"
                      >
                        {downloadMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          "Download"
                        )}
                      </Button>
                    </div>
                  </div>
                  <FormMessage className="pl-2" />
                </FormItem>
              )}
            />
          </form>
        </Form>
      </div>

      {/* Error State */}
      {downloadMutation.isError && (
        <div className="w-full max-w-2xl bg-destructive/10 text-destructive border border-destructive/20 rounded-xl p-4 flex items-start gap-3 animate-in slide-in-from-bottom-2">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-semibold">Couldn't fetch media</h3>
            <p className="text-sm opacity-90">
              {(downloadMutation.error as any)?.response?.data?.error || "Make sure the link is correct and the account is public."}
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && result.success && (
        <div className="w-full max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          {/* Metadata Bar */}
          {(result.username || result.caption) && (
            <div className="bg-card border border-border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex-1 min-w-0">
                {result.username && (
                  <p className="font-semibold text-foreground">@{result.username}</p>
                )}
                {result.caption && (
                  <p className="text-sm text-muted-foreground truncate">{result.caption}</p>
                )}
              </div>
            </div>
          )}

          {/* Media Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {result.media.map((item, index) => (
              <MediaCard key={index} item={item} index={index} />
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}
