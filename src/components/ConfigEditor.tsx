import { Button } from '@/components/ui/button';
import Editor, { useMonaco } from '@monaco-editor/react';
import { Menu, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import schema from '../assets/schema.json';
import {
  fetchConfigFromURL,
  getConfig,
  resetToDefaultConfig,
  setConfig,
  useQRScoutState,
} from '../store/store';
import { Config } from './inputs/BaseInputProps';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { useAutoUpdateTeamNumber } from './inputs/TeamNumberInput'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog'

/**
 * Download a text file
 * @param filename The name of the file
 * @param text The text to put in the file
 */
function download(filename: string, text: string) {
  var element = document.createElement('a');
  element.setAttribute(
    'href',
    'data:text/plain;charset=utf-8,' + encodeURIComponent(text),
  );
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

/**
 * Download the current form data as a json file
 * @param formData The form data to download
 */
function downloadConfig(formData: Config) {
  const configDownload = { ...formData };
  download('QRScout_config.json', JSON.stringify(configDownload));
}

type ConfigEditorProps = {
  onCancel?: () => void;
  onSave?: (config: string) => void;
};

export function ConfigEditor(props: ConfigEditorProps) {
  const monaco = useMonaco();
  const formData = useQRScoutState(state => state.formData);
  const config = useMemo(() => getConfig(), [formData]);
  const [currentConfigText, setCurrentConfigText] = useState<string>(
    JSON.stringify(config, null, 2),
  );
  const [errorCount, setErrorCount] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string>('');
  const scheduleInputRef = useRef<HTMLInputElement>(null);
  const [showScheduleUpload, setShowScheduleUpload] = useState(false);
  const [schedulePreview, setSchedulePreview] = useState<string[]>([]);
  const setScheduleFile = useQRScoutState.setState;
  
  useAutoUpdateTeamNumber(useQRScoutState(state => state.scheduleData));

  useEffect(() => {
    setCurrentConfigText(JSON.stringify(config, null, 2));
  }, [config]);

  useEffect(() => {
    monaco?.languages.json.jsonDefaults.setDiagnosticsOptions({
      validate: true,
      schemas: [
        {
          uri: 'https://frc2713.github.io/QRScout/schema.json',
          fileMatch: ['*'],
          schema,
        },
      ],
    });
  }, [monaco]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, [fileInputRef]);

  const handleUploadChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      var reader = new FileReader();
      reader.onload = function (e) {
        const configText = e.target?.result as string;
        const result = setConfig(configText);
        if (!result.success) {
          setError(result.error.message);
        } else {
          setError(null);
        }
      };
      if (evt.currentTarget.files && evt.currentTarget.files.length > 0) {
        reader.readAsText(evt.currentTarget.files[0]);
      }
    },
    [],
  );

  const handleLoadFromURL = useCallback(async () => {
    const result = await fetchConfigFromURL(url);
    if (!result.success) {
      setError(result.error.message);
    } else {
      setError(null);
    }
  }, [url]);

  const handleScheduleUploadClick = useCallback(() => {
    scheduleInputRef.current?.click();
  }, []);

  const handleScheduleChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      console.log("Handle Schedule Called.");

      const file = evt.currentTarget.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = e => {
        const text = (e.target?.result as string) ?? "";
        
        // Split lines, remove empty lines, trim each line
        const lines = text
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0);
  
        setSchedulePreview(lines.slice(0, 5)); // first 5 lines as preview
  
        // Parse CSV rows with trimmed cells
        const rows = lines.map(l => l.split(",").map(cell => cell.trim()));
  
        if (rows.length < 2) {
          console.warn("CSV seems to have no data rows.");
          return;
        }

        setScheduleFile(prev => ({
          ...prev,
          scheduleFile: rows,
        }));
      };
      reader.readAsText(file);
    },
    []
  );
  
  return (
    <div className="flex flex-col gap-2 h-full pb-2">
      <div className="flex-grow rounded-lg overflow-clip ">
        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded-lg">{error}</div>
        )}
        <Editor
          defaultLanguage="json"
          value={currentConfigText}
          theme="vs-dark"
          onValidate={markers => {
            const severeErrors = markers.filter(m => m.severity > 4);
            setErrorCount(severeErrors.length);
          }}
          onChange={value => value && setCurrentConfigText(value)}
        />
      </div>
      <div className="flex flex-col gap-4">
        {/* Mobile view (<640px): URL input and button appear in a full-width row above other controls */}
        <div className="flex flex-col sm:hidden gap-2 w-full">
          <Input
            type="url"
            placeholder="Enter config URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            className="w-full"
          />
          <Button onClick={handleLoadFromURL} className="w-full">Load from URL</Button>
        </div>

        {/* Desktop view (≥640px): URL input and button appear inline with other controls */}
        <div className="flex flex-row items-center gap-4 flex-wrap">
          <div className="hidden sm:flex flex-row items-center gap-2 flex-1">
            <Input
              type="url"
              placeholder="Enter config URL"
              value={url}
              onChange={e => setUrl(e.target.value)}
              className="flex-1 min-w-0"
            />
            <Button onClick={handleLoadFromURL}>Load from URL</Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary">
                <Menu className="h-5 w-5" />
                Options
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => resetToDefaultConfig()}>
                Reset To Default Config
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadConfig(config)}>
                Download Config
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleUploadClick}>
                Upload Config
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowScheduleUpload(true)}>
                Upload Match Schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Button
            variant="destructive"
            onClick={() => props.onSave && props.onSave(currentConfigText)}
            disabled={currentConfigText.length === 0 || errorCount > 0}
          >
            <Save className="h-5 w-5" />
            Save
          </Button>

          <Input
            type="file"
            ref={fileInputRef}
            onChange={handleUploadChange}
            className="hidden"
            aria-hidden="true"
            accept=".json,application/json"
          />
        </div>
      </div>
      {/* Match Schedule Upload Dialog */}
      <Dialog open={showScheduleUpload} onOpenChange={setShowScheduleUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Match Schedule</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <Button variant="outline" onClick={handleScheduleUploadClick}>
              <Upload className="h-4 w-4 mr-2" /> Select CSV
            </Button>
            <Input
              type="file"
              ref={scheduleInputRef}
              onChange={handleScheduleChange}
              className="hidden"
              aria-hidden="true"
              accept=".csv,text/csv"
            />
            {schedulePreview.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-semibold">Preview:</p>
                <pre className="bg-gray-100 p-2 rounded">
                  {schedulePreview.join("\n")}
                </pre>
              </div>
            )}

            {/* NEW Save Button */}
            {schedulePreview.length > 0 && (
              <Button
                variant="default"
                onClick={() => {
                  // You can add any "final confirmation" logic here if needed
                  console.log("Match schedule saved.");
                  props.onCancel?.();
                  setShowScheduleUpload(false); // close dialog
                }}
              >
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
