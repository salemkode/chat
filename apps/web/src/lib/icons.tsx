import * as React from 'react'
import { phosphorIcons } from '@/lib/phosphor-icons'

type IconModule = Record<string, AppIcon>

export type AppIcon = React.ComponentType<{
  className?: string
  size?: string | number
}>

const phosphorModule: IconModule = phosphorIcons

function pickIcon(phosphorNames: string[], fallback = 'Sparkle'): AppIcon {
  for (const name of phosphorNames) {
    const icon = phosphorModule[name]
    if (icon) {
      return icon
    }
  }

  const fallbackIcon = phosphorModule[fallback]
  if (fallbackIcon) {
    return fallbackIcon
  }

  return phosphorIcons.Sparkle
}

export const Loader2 = pickIcon(['Spinner'], 'Loader2')
const Loader2Icon = Loader2
const LoaderCircle = Loader2
export const Check = pickIcon(['Check'], 'Check')
export const CheckIcon = Check
export const X = pickIcon(['X'], 'X')
export const XIcon = X
export const ChevronDown = pickIcon(['CaretDown'], 'ChevronDown')
export const ChevronDownIcon = ChevronDown
const ChevronLeft = pickIcon(['CaretLeft'], 'ChevronLeft')
const ChevronLeftIcon = ChevronLeft
export const ChevronUp = pickIcon(['CaretUp'], 'ChevronUp')
export const ChevronUpIcon = ChevronUp
export const ChevronRight = pickIcon(['CaretRight'], 'ChevronRight')
const ChevronRightIcon = ChevronRight
export const Circle = pickIcon(['Circle'], 'Circle')
const CircleIcon = Circle
export const Search = pickIcon(['MagnifyingGlass'], 'Search')
export const SearchIcon = Search
export const PanelLeftIcon = pickIcon(['Sidebar'], 'PanelLeft')
const GripVerticalIcon = pickIcon(['DotsSixVertical'], 'GripVertical')
export const ArrowLeft = pickIcon(['ArrowLeft'], 'ArrowLeft')
const ArrowRight = pickIcon(['ArrowRight'], 'ArrowRight')
export const ArrowUp = pickIcon(['ArrowUp'], 'ArrowUp')
const ArrowDown = pickIcon(['ArrowDown'], 'ArrowDown')
const ArrowUpRight = pickIcon(['ArrowUpRight'], 'ArrowUpRight')
const ArrowDownRight = pickIcon(['ArrowDownRight'], 'ArrowDownRight')
const ArrowUpLeft = pickIcon(['ArrowUpLeft'], 'ArrowUpLeft')
const ArrowDownLeft = pickIcon(['ArrowDownLeft'], 'ArrowDownLeft')
const MoreHorizontal = pickIcon(['DotsThree', 'DotsThreeOutline'], 'MoreHorizontal')
const MoreHorizontalIcon = MoreHorizontal
export const MinusIcon = pickIcon(['Minus'], 'Minus')
const MessageCircle = pickIcon(['ChatCircle'], 'MessageCircle')
export const MessageSquare = pickIcon(['ChatText'], 'MessageSquare')
export const MessageSquareText = pickIcon(
  ['ChatTeardropText', 'ChatCircleText'],
  'MessageSquareText',
)
export const MoveRight = pickIcon(['ArrowRight'], 'MoveRight')
export const RefreshCcw = pickIcon(['ArrowsClockwise'], 'RefreshCcw')
export const RefreshCw = RefreshCcw
export const RotateCcw = pickIcon(['ArrowCounterClockwise'], 'RotateCcw')
export const WandSparkles = pickIcon(['MagicWand'], 'WandSparkles')
export const CircleDollarSign = pickIcon(['CurrencyDollar'], 'CircleDollarSign')
export const NotebookPen = pickIcon(['Notepad', 'Notebook'], 'NotebookPen')
const Clock3 = pickIcon(['Clock'], 'Clock3')
const FolderKanban = pickIcon(['Kanban'], 'FolderKanban')
const Code2 = pickIcon(['CodeBlock'], 'Code2')
export const Volume2 = pickIcon(['SpeakerHigh', 'SpeakerSimpleHigh'], 'Volume2')
export const Link2 = pickIcon(['LinkSimpleHorizontal', 'LinkSimple'], 'Link2')
const Link = pickIcon(['LinkSimpleHorizontal', 'LinkSimple', 'Link'], 'Link')
export const AlertCircle = pickIcon(['WarningCircle'], 'AlertCircle')
export const TriangleAlert = pickIcon(['WarningCircle'], 'TriangleAlert')
const TriangleAlertIcon = TriangleAlert
const Home = pickIcon(['House'], 'Home')
const Menu = pickIcon(['List'], 'Menu')
export const Paperclip = pickIcon(['Paperclip'], 'Paperclip')
const Smile = pickIcon(['Smiley'], 'Smile')
const Send = pickIcon(['PaperPlaneRight'], 'Send')
export const Sun = pickIcon(['Sun', 'SunDim'], 'Sun')
export const Moon = pickIcon(['MoonStars', 'Moon'], 'Moon')
export const Globe = pickIcon(['Globe', 'GlobeHemisphereWest'], 'Globe')
export const FileText = pickIcon(['FileText', 'Article', 'Files'], 'FileText')
export const ExternalLink = pickIcon(['ArrowSquareOut', 'ArrowLineUpRight'], 'ExternalLink')
export const Share2 = pickIcon(['ShareNetwork', 'Share'], 'Share2')
export const Smartphone = pickIcon(['DeviceMobile'], 'Smartphone')
export const Pin = pickIcon(['PushPinSimple'], 'Pin')
export const Plus = pickIcon(['Plus'], 'Plus')
export const Star = pickIcon(['Star'], 'Star')
const AtSign = pickIcon(['At'], 'AtSign')
const Zap = pickIcon(['Lightning'], 'Zap')
export const Bot = pickIcon(['Robot'], 'Bot')
export const Boxes = pickIcon(['Cube'], 'Boxes')
export const Users = pickIcon(['Users', 'UsersThree'], 'Users')
export const Shield = pickIcon(['Shield', 'ShieldCheck'], 'Shield')
export const Folder = pickIcon(['Folder', 'FolderSimple'], 'Folder')
export const GraduationCap = pickIcon(['GraduationCap'], 'GraduationCap')
export const Lightbulb = pickIcon(['Lightbulb'], 'Lightbulb')
export const Plane = pickIcon(['Airplane', 'AirplaneTakeoff'], 'Plane')
export const Database = pickIcon(['Database'], 'Database')
const Tag = pickIcon(['Tag'], 'Tag')
export const Trash2 = pickIcon(['Trash'], 'Trash2')
const Trash = pickIcon(['Trash'], 'Trash')
const Bell = pickIcon(['Bell'], 'Bell')
const LineChart = pickIcon(['ChartLineUp'], 'LineChart')
const GalleryVerticalEnd = pickIcon(['Rows', 'ImagesSquare'], 'GalleryVerticalEnd')
export const Settings2 = pickIcon(['Sliders'], 'Settings2')
const CornerUpRight = pickIcon(['ArrowBendUpRight'], 'CornerUpRight')
const CornerUpLeft = pickIcon(['ArrowBendUpLeft'], 'CornerUpLeft')
export const Copy = pickIcon(['Copy'], 'Copy')
export const Square = pickIcon(['Square'], 'Square')
export const Brain = pickIcon(['Brain'], 'Brain')
export const Camera = pickIcon(['Camera'], 'Camera')
export const Monitor = pickIcon(['Monitor'], 'Monitor')
export const Palette = pickIcon(['Palette'], 'Palette')
export const Settings = pickIcon(['Gear', 'Sliders'], 'Settings')
export const User = pickIcon(['User'], 'User')
export const UserCircle = pickIcon(['UserCircle'], 'UserCircle')
export const Wrench = pickIcon(['Wrench'], 'Wrench')
export const Upload = pickIcon(['Upload', 'UploadSimple'], 'Upload')
export const Sparkles = pickIcon(['Sparkle'], 'Sparkles')
const Workflow = pickIcon(['TreeStructure'], 'Workflow')
const Gem = pickIcon(['Gem'], 'Gem')
export const Eye = pickIcon(['Eye'], 'Eye')
export const EyeOff = pickIcon(['EyeSlash', 'EyeClosed'], 'EyeOff')
export const BookMarked = pickIcon(['BookmarkSimple', 'BookOpen'], 'BookMarked')
export const PencilLine = pickIcon(['PencilLine', 'PencilSimpleLine'], 'PencilLine')
const StarOff = pickIcon(['StarHalf', 'Star'], 'StarOff')
export const LogIn = pickIcon(['SignIn'], 'LogIn')
export const LogOut = pickIcon(['SignOut'], 'LogOut')
const CircleCheckIcon = pickIcon(['CheckCircle'], 'CircleCheck')
const InfoIcon = pickIcon(['Info'], 'Info')
const OctagonXIcon = pickIcon(['XCircle'], 'OctagonX')
const Rocket = pickIcon(['Rocket'], 'Rocket')
export const Target = pickIcon(['Target'], 'Target')
const Compass = pickIcon(['Compass'], 'Compass')
const Map = pickIcon(['MapTrifold'], 'Map')
const BookOpen = pickIcon(['BookOpen'], 'BookOpen')
const Bookmark = pickIcon(['BookmarkSimple', 'Bookmark'], 'Bookmark')
const Document = pickIcon(['FileText', 'Article'], 'FileText')
export const FolderOpen = pickIcon(['FolderOpen'], 'FolderOpen')
export const Code = pickIcon(['CodeBlock', 'Code'], 'Code')
const Terminal = pickIcon(['Terminal'], 'Terminal')
const Bug = pickIcon(['Bug'], 'Bug')
const GitBranch = pickIcon(['GitBranch'], 'GitBranch')
const Server = pickIcon(['Server'], 'Server')
const Cloud = pickIcon(['Cloud'], 'Cloud')
const Lock = pickIcon(['Lock'], 'Lock')
export const Key = pickIcon(['Key'], 'Key')
const Tuning = pickIcon(['Sliders'], 'Sliders')
const BarChart = pickIcon(['ChartBar'], 'BarChart')
const PieChart = pickIcon(['ChartPie'], 'PieChart')
const TrendingUp = pickIcon(['TrendUp', 'ChartLineUp'], 'TrendingUp')
const DollarSign = pickIcon(['CurrencyDollar'], 'DollarSign')
export const CreditCard = pickIcon(['CreditCard'], 'CreditCard')
const ShoppingCart = pickIcon(['ShoppingCart'], 'ShoppingCart')
const Package = pickIcon(['Package'], 'Package')
const Truck = pickIcon(['Truck'], 'Truck')
const Building = pickIcon(['Building'], 'Building')
const Briefcase = pickIcon(['Briefcase'], 'Briefcase')
const Team = pickIcon(['UsersThree', 'Users'], 'Users')
const Heart = pickIcon(['Heart'], 'Heart')
const ThumbsUp = pickIcon(['ThumbsUp'], 'ThumbsUp')
const CheckCircle = pickIcon(['CheckCircle'], 'CheckCircle')
const Info = pickIcon(['Info'], 'Info')
const HelpCircle = pickIcon(['Question'], 'HelpCircle')
const Question = pickIcon(['Question'], 'Question')
const Flag = pickIcon(['Flag'], 'Flag')
const Hash = pickIcon(['Hash'], 'Hash')
const Mail = pickIcon(['EnvelopeSimple', 'Envelope'], 'Mail')
const Phone = pickIcon(['Phone'], 'Phone')
const Video = pickIcon(['VideoCamera'], 'Video')
const Image = pickIcon(['Image'], 'Image')
const Music = pickIcon(['MusicNote'], 'Music')
const Film = pickIcon(['FilmStrip'], 'Film')
const Mic = pickIcon(['Microphone'], 'Mic')
const Headphones = pickIcon(['Headphones'], 'Headphones')
const Speaker = pickIcon(['SpeakerHigh'], 'Speaker')
const Play = pickIcon(['Play'], 'Play')
const Pause = pickIcon(['Pause'], 'Pause')
const Stop = pickIcon(['Stop'], 'Stop')
const SkipForward = pickIcon(['SkipForward'], 'SkipForward')
const SkipBack = pickIcon(['SkipBack'], 'SkipBack')
const Repeat = pickIcon(['Repeat'], 'Repeat')
const Shuffle = pickIcon(['Shuffle'], 'Shuffle')
const ListIcon = Menu

export const appIconNames = [
  'Sparkles',
  'Brain',
  'Bot',
  'Shield',
  'Globe',
  'Search',
  'Code2',
  'ChartLineUp',
  'Boxes',
  'Cloud',
  'Rocket',
  'Database',
  'Workflow',
  'Gem',
  'MessageCircle',
  'MessageSquare',
  'Lightbulb',
  'Zap',
  'Star',
  'Folder',
  'FileText',
  'Home',
  'Users',
  'Tag',
  'AtSign',
  'Phone',
  'Video',
  'Camera',
  'Music',
  'Calendar',
  'Clock3',
  'Sun',
  'Moon',
  'Plane',
  'Map',
  'Compass',
  'Paperclip',
  'Link2',
  'ExternalLink',
  'Copy',
  'Check',
  'Plus',
  'X',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'MessageSquareText',
  'NotebookPen',
  'CircleDollarSign',
  'GraduationCap',
  'UserCircle',
  'Wrench',
  'Palette',
  'Settings',
  'Monitor',
  'Trash',
  'Bell',
  'Smartphone',
  'Pin',
] as const

const appIconMap = {
  AlertCircle,
  ArrowDown,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowUpLeft,
  ArrowUpRight,
  AtSign,
  Bell,
  Bot,
  Boxes,
  Brain,
  BookMarked,
  Camera,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Circle,
  CircleDollarSign,
  Clock3,
  Cloud,
  Code,
  Code2,
  Compass,
  Copy,
  CornerUpLeft,
  CornerUpRight,
  Database,
  ExternalLink,
  FileText,
  Folder,
  FolderKanban,
  GalleryVerticalEnd,
  Gem,
  Globe,
  GraduationCap,
  Home,
  Eye,
  EyeOff,
  Lightbulb,
  LineChart,
  Loader2,
  LoaderCircle,
  LogIn,
  LogOut,
  Menu,
  MessageCircle,
  MessageSquare,
  MessageSquareText,
  Monitor,
  Moon,
  MoreHorizontal,
  MoveRight,
  NotebookPen,
  OctagonXIcon,
  Palette,
  Paperclip,
  PencilLine,
  Phone,
  Pin,
  Plane,
  Plus,
  RefreshCcw,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  Settings2,
  Share2,
  Shield,
  Smile,
  Smartphone,
  Sparkles,
  Square,
  Star,
  Sun,
  Tag,
  Trash,
  Trash2,
  TriangleAlert,
  Upload,
  User,
  UserCircle,
  Volume2,
  WandSparkles,
  Workflow,
  Wrench,
  X,
  Zap,
} satisfies Record<string, AppIcon>

export function getIcon(name: string): AppIcon | undefined {
  const normalizedName = name
    .replace(/[-_](.)/g, (_, char: string) => char.toUpperCase())
    .replace(/^(.)/, (_, char: string) => char.toUpperCase())

  const icon = appIconMap[normalizedName as keyof typeof appIconMap]
  if (icon) {
    return icon
  }

  const phosphorIcon = phosphorModule[normalizedName]
  if (phosphorIcon) {
    return phosphorIcon
  }

  return undefined
}
