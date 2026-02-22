#!/usr/bin/env bash

#############################################
# Brandpack Tools Management Script
# Manages development and production servers
#############################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Configuration
PROJECT_ROOT="/home/el/Documents/El-Projects/brandpack-tools"
SERVER_DIR="$PROJECT_ROOT/server"
CLIENT_DIR="$PROJECT_ROOT/client"
DEV_SERVICE="brandpack-dev.service"
PROD_SERVICE="brandpack-tools.service"
DEV_CLIENT_PORT=5173
SERVER_PORT=8080
HEALTH_URL="http://localhost:8080/api/health"
DEV_CLIENT_URL="http://localhost:5173"
PROD_LOCAL_URL="http://localhost:8080"
PROD_DOMAIN="https://eldev.cherrysofa.com"

# Health check settings
HEALTH_CHECK_TIMEOUT=30
HEALTH_CHECK_INTERVAL=2

#############################################
# Utility Functions
#############################################

print_header() {
    echo -e "${BOLD}${CYAN}▶ $1${NC}"
}

print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

print_warning() {
    echo -e "  ${YELLOW}⚠${NC} $1"
}

print_info() {
    echo -e "  ${BLUE}ℹ${NC} $1"
}

print_step() {
    echo -e "  ${CYAN}⏳${NC} $1"
}

print_box() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    while IFS= read -r line; do
        echo -e "  ${BOLD}$line${NC}"
    done
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

check_dependencies() {
    local missing=()

    command -v node >/dev/null 2>&1 || missing+=("node")
    command -v npm >/dev/null 2>&1 || missing+=("npm")
    command -v systemctl >/dev/null 2>&1 || missing+=("systemctl")
    command -v curl >/dev/null 2>&1 || missing+=("curl")

    if [ ${#missing[@]} -gt 0 ]; then
        print_error "Missing required dependencies: ${missing[*]}"
        return 1
    fi

    print_success "Dependencies check passed"
    return 0
}

check_port_usage() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

get_service_status() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo "running"
    else
        echo "stopped"
    fi
}

health_check() {
    local url=$1
    local timeout=${2:-$HEALTH_CHECK_TIMEOUT}
    local interval=${3:-$HEALTH_CHECK_INTERVAL}
    local elapsed=0

    while [ $elapsed -lt $timeout ]; do
        if curl -sf "$url" >/dev/null 2>&1; then
            return 0
        fi
        echo -n "."
        sleep $interval
        elapsed=$((elapsed + interval))
    done

    echo ""
    return 1
}

#############################################
# Service Management Functions
#############################################

start_dev() {
    print_header "Starting Brandpack Tools (Development Mode)"

    # Check dependencies
    check_dependencies || return 1

    # Check if production is running (port conflict)
    if [ "$(get_service_status $PROD_SERVICE)" = "running" ]; then
        print_warning "Production service is running on port $SERVER_PORT"
        read -p "  Stop production and start dev? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            stop_prod
        else
            print_error "Cannot start dev mode while production is running"
            return 1
        fi
    fi

    # Check port availability
    if check_port_usage $SERVER_PORT; then
        print_error "Port $SERVER_PORT is already in use"
        print_info "Run: lsof -i :$SERVER_PORT to see what's using it"
        return 1
    fi

    if check_port_usage $DEV_CLIENT_PORT; then
        print_error "Port $DEV_CLIENT_PORT is already in use"
        print_info "Run: lsof -i :$DEV_CLIENT_PORT to see what's using it"
        return 1
    fi

    print_success "Port availability verified"

    # Start service
    print_step "Starting $DEV_SERVICE"
    if ! sudo systemctl start "$DEV_SERVICE"; then
        print_error "Failed to start $DEV_SERVICE"
        print_info "Check logs: sudo journalctl -u $DEV_SERVICE -n 50"
        return 1
    fi

    print_success "Service started"

    # Health checks
    print_step "Waiting for services to initialize..."

    if health_check "$HEALTH_URL" 30 2; then
        echo ""
        print_success "Backend server healthy ($HEALTH_URL)"
    else
        print_error "Backend server health check failed"
        print_info "Check logs: ./brandpack.sh logs dev"
        return 1
    fi

    if health_check "$DEV_CLIENT_URL" 30 2; then
        echo ""
        print_success "Frontend dev server healthy ($DEV_CLIENT_URL)"
    else
        print_error "Frontend dev server health check failed"
        print_info "Check logs: ./brandpack.sh logs dev"
        return 1
    fi

    # Success message
    echo -e "
${GREEN}${BOLD}Development mode started successfully!${NC}

  🌐 Frontend:  ${CYAN}$DEV_CLIENT_URL${NC}
  🔌 Backend:   ${CYAN}$HEALTH_URL${NC}

  View logs:    ${YELLOW}./brandpack.sh logs dev${NC}
  Stop:         ${YELLOW}./brandpack.sh stop dev${NC}
" | print_box

    return 0
}

start_prod() {
    print_header "Starting Brandpack Tools (Production Mode)"

    # Check dependencies
    check_dependencies || return 1

    # Check if dev is running (port conflict)
    if [ "$(get_service_status $DEV_SERVICE)" = "running" ]; then
        print_warning "Development service is running on port $SERVER_PORT"
        read -p "  Stop dev and start production? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            stop_dev
        else
            print_error "Cannot start production while dev mode is running"
            return 1
        fi
    fi

    # Check if client is built
    if [ ! -d "$CLIENT_DIR/dist" ] || [ -z "$(ls -A $CLIENT_DIR/dist 2>/dev/null)" ]; then
        print_warning "Client not built (client/dist is missing or empty)"
        read -p "  Build client now? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
            build_client || return 1
        else
            print_error "Cannot start production without built client"
            return 1
        fi
    fi

    print_success "Client build verified"

    # Check port availability
    if check_port_usage $SERVER_PORT; then
        print_error "Port $SERVER_PORT is already in use"
        print_info "Run: lsof -i :$SERVER_PORT to see what's using it"
        return 1
    fi

    print_success "Port availability verified"

    # Start service
    print_step "Starting $PROD_SERVICE"
    if ! sudo systemctl start "$PROD_SERVICE"; then
        print_error "Failed to start $PROD_SERVICE"
        print_info "Check logs: sudo journalctl -u $PROD_SERVICE -n 50"
        return 1
    fi

    print_success "Service started"

    # Health check
    print_step "Waiting for service to initialize..."

    if health_check "$HEALTH_URL" 30 2; then
        echo ""
        print_success "Production server healthy"
    else
        print_error "Production server health check failed"
        print_info "Check logs: ./brandpack.sh logs prod"
        return 1
    fi

    # Success message
    echo -e "
${GREEN}${BOLD}Production mode started successfully!${NC}

  🌐 Local:     ${CYAN}$PROD_LOCAL_URL${NC}
  🌍 Public:    ${CYAN}$PROD_DOMAIN${NC}
  🔌 API:       ${CYAN}$HEALTH_URL${NC}

  View logs:    ${YELLOW}./brandpack.sh logs prod${NC}
  Stop:         ${YELLOW}./brandpack.sh stop prod${NC}
" | print_box

    return 0
}

stop_dev() {
    print_header "Stopping Development Mode"

    if [ "$(get_service_status $DEV_SERVICE)" = "stopped" ]; then
        print_info "Development service is already stopped"
        return 0
    fi

    print_step "Stopping $DEV_SERVICE"
    if sudo systemctl stop "$DEV_SERVICE"; then
        print_success "Development service stopped"
        return 0
    else
        print_error "Failed to stop $DEV_SERVICE"
        return 1
    fi
}

stop_prod() {
    print_header "Stopping Production Mode"

    if [ "$(get_service_status $PROD_SERVICE)" = "stopped" ]; then
        print_info "Production service is already stopped"
        return 0
    fi

    print_step "Stopping $PROD_SERVICE"
    if sudo systemctl stop "$PROD_SERVICE"; then
        print_success "Production service stopped"
        return 0
    else
        print_error "Failed to stop $PROD_SERVICE"
        return 1
    fi
}

restart_dev() {
    print_header "Restarting Development Mode"
    stop_dev
    sleep 2
    start_dev
}

restart_prod() {
    print_header "Restarting Production Mode"
    stop_prod
    sleep 2
    start_prod
}

#############################################
# Build and Deploy Functions
#############################################

build_client() {
    print_header "Building Client"

    cd "$PROJECT_ROOT"

    print_step "Running npm run build..."
    if npm run build; then
        print_success "Client built successfully"

        if [ -d "$CLIENT_DIR/dist" ]; then
            local size=$(du -sh "$CLIENT_DIR/dist" | cut -f1)
            print_info "Build output: client/dist ($size)"
        fi

        return 0
    else
        print_error "Client build failed"
        return 1
    fi
}

deploy() {
    print_header "Deploy to Production"

    # Build client
    build_client || return 1

    # Stop production if running
    if [ "$(get_service_status $PROD_SERVICE)" = "running" ]; then
        stop_prod
        sleep 2
    fi

    # Start production
    start_prod
}

#############################################
# Switch Mode Function
#############################################

switch_mode() {
    local from=$1
    local to=$2

    print_header "Switching from $from to $to"

    if [ "$from" = "dev" ] && [ "$to" = "prod" ]; then
        stop_dev
        sleep 2
        start_prod
    elif [ "$from" = "prod" ] && [ "$to" = "dev" ]; then
        stop_prod
        sleep 2
        start_dev
    else
        print_error "Invalid switch mode: $from to $to"
        print_info "Valid options: dev <-> prod"
        return 1
    fi
}

#############################################
# Status and Logs Functions
#############################################

show_status() {
    print_header "Brandpack Tools Status"
    echo ""

    # Service status
    local dev_status=$(get_service_status $DEV_SERVICE)
    local prod_status=$(get_service_status $PROD_SERVICE)

    echo -e "${BOLD}Services:${NC}"
    if [ "$dev_status" = "running" ]; then
        echo -e "  Development:  ${GREEN}●${NC} Running"
    else
        echo -e "  Development:  ${RED}●${NC} Stopped"
    fi

    if [ "$prod_status" = "running" ]; then
        echo -e "  Production:   ${GREEN}●${NC} Running"
    else
        echo -e "  Production:   ${RED}●${NC} Stopped"
    fi

    echo ""

    # Port usage
    echo -e "${BOLD}Ports:${NC}"
    if check_port_usage $DEV_CLIENT_PORT; then
        echo -e "  $DEV_CLIENT_PORT (Vite):    ${GREEN}●${NC} In use"
    else
        echo -e "  $DEV_CLIENT_PORT (Vite):    ${RED}●${NC} Free"
    fi

    if check_port_usage $SERVER_PORT; then
        echo -e "  $SERVER_PORT (Server):  ${GREEN}●${NC} In use"
    else
        echo -e "  $SERVER_PORT (Server):  ${RED}●${NC} Free"
    fi

    echo ""

    # Database info
    echo -e "${BOLD}Database:${NC}"
    if [ -f "$SERVER_DIR/data/brandpack.db" ]; then
        local db_size=$(du -sh "$SERVER_DIR/data/brandpack.db" | cut -f1)
        echo -e "  Location:     $SERVER_DIR/data/brandpack.db"
        echo -e "  Size:         $db_size"
    else
        echo -e "  ${YELLOW}⚠${NC} Database not found"
    fi

    echo ""

    # Client build info
    echo -e "${BOLD}Client Build:${NC}"
    if [ -d "$CLIENT_DIR/dist" ] && [ -n "$(ls -A $CLIENT_DIR/dist 2>/dev/null)" ]; then
        local dist_size=$(du -sh "$CLIENT_DIR/dist" | cut -f1)
        echo -e "  Status:       ${GREEN}Built${NC}"
        echo -e "  Location:     client/dist"
        echo -e "  Size:         $dist_size"
    else
        echo -e "  Status:       ${YELLOW}Not built${NC}"
        echo -e "  ${YELLOW}⚠${NC} Run: ./brandpack.sh build"
    fi

    echo ""

    # URLs
    echo -e "${BOLD}URLs:${NC}"
    if [ "$dev_status" = "running" ]; then
        echo -e "  ${CYAN}Frontend:${NC}  $DEV_CLIENT_URL"
        echo -e "  ${CYAN}Backend:${NC}   $HEALTH_URL"
    elif [ "$prod_status" = "running" ]; then
        echo -e "  ${CYAN}Local:${NC}     $PROD_LOCAL_URL"
        echo -e "  ${CYAN}Public:${NC}    $PROD_DOMAIN"
    else
        echo -e "  ${YELLOW}No services running${NC}"
    fi

    echo ""
}

show_logs() {
    local mode=$1
    local lines=${2:-50}

    if [ "$mode" = "dev" ]; then
        print_header "Development Logs (last $lines lines)"
        sudo journalctl -u "$DEV_SERVICE" -n "$lines" --no-pager
        echo ""
        print_info "Follow logs: sudo journalctl -u $DEV_SERVICE -f"
    elif [ "$mode" = "prod" ]; then
        print_header "Production Logs (last $lines lines)"
        sudo journalctl -u "$PROD_SERVICE" -n "$lines" --no-pager
        echo ""
        print_info "Follow logs: sudo journalctl -u $PROD_SERVICE -f"
    else
        print_error "Invalid mode: $mode"
        print_info "Valid options: dev, prod"
        return 1
    fi
}

tail_logs() {
    local mode=$1

    if [ "$mode" = "dev" ]; then
        print_header "Following Development Logs (Ctrl+C to stop)"
        echo ""
        sudo journalctl -u "$DEV_SERVICE" -f
    elif [ "$mode" = "prod" ]; then
        print_header "Following Production Logs (Ctrl+C to stop)"
        echo ""
        sudo journalctl -u "$PROD_SERVICE" -f
    else
        print_error "Invalid mode: $mode"
        return 1
    fi
}

#############################################
# Interactive Menu
#############################################

show_menu() {
    clear
    echo -e "${BOLD}${CYAN}"
    echo "╔════════════════════════════════════════════╗"
    echo "║    Brandpack Tools Management Console     ║"
    echo "╚════════════════════════════════════════════╝"
    echo -e "${NC}"

    local dev_status=$(get_service_status $DEV_SERVICE)
    local prod_status=$(get_service_status $PROD_SERVICE)

    if [ "$dev_status" = "running" ]; then
        echo -e "  ${GREEN}●${NC} Development: Running"
    else
        echo -e "  ${RED}●${NC} Development: Stopped"
    fi

    if [ "$prod_status" = "running" ]; then
        echo -e "  ${GREEN}●${NC} Production:  Running"
    else
        echo -e "  ${RED}●${NC} Production:  Stopped"
    fi

    echo ""
    echo -e "${BOLD}Development Mode:${NC}"
    echo "  1) Start development"
    echo "  2) Stop development"
    echo "  3) Restart development"
    echo "  4) View dev logs"
    echo ""
    echo -e "${BOLD}Production Mode:${NC}"
    echo "  5) Start production"
    echo "  6) Stop production"
    echo "  7) Restart production"
    echo "  8) View production logs"
    echo ""
    echo -e "${BOLD}Build & Deploy:${NC}"
    echo "  9) Build client"
    echo "  10) Deploy to production"
    echo ""
    echo -e "${BOLD}Other:${NC}"
    echo "  11) Show status"
    echo "  12) Switch dev <-> prod"
    echo "  0) Exit"
    echo ""
}

interactive_menu() {
    while true; do
        show_menu
        read -p "Select option: " choice
        echo ""

        case $choice in
            1) start_dev; read -p "Press Enter to continue..." ;;
            2) stop_dev; read -p "Press Enter to continue..." ;;
            3) restart_dev; read -p "Press Enter to continue..." ;;
            4) show_logs dev; read -p "Press Enter to continue..." ;;
            5) start_prod; read -p "Press Enter to continue..." ;;
            6) stop_prod; read -p "Press Enter to continue..." ;;
            7) restart_prod; read -p "Press Enter to continue..." ;;
            8) show_logs prod; read -p "Press Enter to continue..." ;;
            9) build_client; read -p "Press Enter to continue..." ;;
            10) deploy; read -p "Press Enter to continue..." ;;
            11) show_status; read -p "Press Enter to continue..." ;;
            12)
                echo "Switch from (dev/prod):"
                read from
                echo "Switch to (dev/prod):"
                read to
                switch_mode "$from" "$to"
                read -p "Press Enter to continue..."
                ;;
            0) echo "Goodbye!"; exit 0 ;;
            *) print_error "Invalid option"; read -p "Press Enter to continue..." ;;
        esac
    done
}

#############################################
# Help Text
#############################################

show_help() {
    cat << EOF
${BOLD}Brandpack Tools Management Script${NC}

${BOLD}USAGE:${NC}
  ./brandpack.sh <command> [options]
  ./brandpack.sh -i                 Interactive menu

${BOLD}COMMANDS:${NC}
  ${CYAN}start dev${NC}                    Start development mode (ports 5173 + 8080)
  ${CYAN}start prod${NC}                   Start production mode (port 8080)
  ${CYAN}stop dev${NC}                     Stop development mode
  ${CYAN}stop prod${NC}                    Stop production mode
  ${CYAN}restart dev${NC}                  Restart development mode
  ${CYAN}restart prod${NC}                 Restart production mode

  ${CYAN}build${NC}                        Build client (to client/dist)
  ${CYAN}deploy${NC}                       Build client + restart production

  ${CYAN}status${NC}                       Show status of all services
  ${CYAN}logs dev [lines]${NC}             View development logs (default: 50 lines)
  ${CYAN}logs prod [lines]${NC}            View production logs (default: 50 lines)
  ${CYAN}tail dev${NC}                     Follow development logs (Ctrl+C to stop)
  ${CYAN}tail prod${NC}                    Follow production logs (Ctrl+C to stop)

  ${CYAN}switch dev prod${NC}              Switch from dev to production
  ${CYAN}switch prod dev${NC}              Switch from production to dev

  ${CYAN}help${NC}                         Show this help message

${BOLD}EXAMPLES:${NC}
  ./brandpack.sh start dev          Start development server
  ./brandpack.sh deploy             Build and deploy to production
  ./brandpack.sh status             Check what's running
  ./brandpack.sh tail prod          Follow production logs
  ./brandpack.sh -i                 Launch interactive menu

${BOLD}URLS:${NC}
  Development Frontend:  http://localhost:5173
  Development Backend:   http://localhost:8080/api/health
  Production Local:      http://localhost:8080
  Production Public:     https://eldev.cherrysofa.com

${BOLD}SERVICE FILES:${NC}
  Development:  $DEV_SERVICE
  Production:   $PROD_SERVICE

${BOLD}NOTES:${NC}
  - Development and production cannot run simultaneously (port conflict)
  - Production requires client to be built first (runs automatically)
  - All commands require sudo for systemctl operations
  - Health checks verify services started correctly

EOF
}

#############################################
# Main Entry Point
#############################################

main() {
    # Check if running from correct directory
    if [ ! -f "$PROJECT_ROOT/package.json" ]; then
        print_error "Must run from project root: $PROJECT_ROOT"
        exit 1
    fi

    # Parse arguments
    if [ $# -eq 0 ]; then
        show_help
        exit 0
    fi

    case "$1" in
        -i|--interactive)
            interactive_menu
            ;;
        start)
            case "$2" in
                dev) start_dev ;;
                prod) start_prod ;;
                *) print_error "Usage: ./brandpack.sh start [dev|prod]"; exit 1 ;;
            esac
            ;;
        stop)
            case "$2" in
                dev) stop_dev ;;
                prod) stop_prod ;;
                *) print_error "Usage: ./brandpack.sh stop [dev|prod]"; exit 1 ;;
            esac
            ;;
        restart)
            case "$2" in
                dev) restart_dev ;;
                prod) restart_prod ;;
                *) print_error "Usage: ./brandpack.sh restart [dev|prod]"; exit 1 ;;
            esac
            ;;
        build)
            build_client
            ;;
        deploy)
            deploy
            ;;
        status)
            show_status
            ;;
        logs)
            case "$2" in
                dev) show_logs dev "${3:-50}" ;;
                prod) show_logs prod "${3:-50}" ;;
                *) print_error "Usage: ./brandpack.sh logs [dev|prod] [lines]"; exit 1 ;;
            esac
            ;;
        tail)
            case "$2" in
                dev) tail_logs dev ;;
                prod) tail_logs prod ;;
                *) print_error "Usage: ./brandpack.sh tail [dev|prod]"; exit 1 ;;
            esac
            ;;
        switch)
            if [ $# -ne 3 ]; then
                print_error "Usage: ./brandpack.sh switch [dev|prod] [dev|prod]"
                exit 1
            fi
            switch_mode "$2" "$3"
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Unknown command: $1"
            echo ""
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
