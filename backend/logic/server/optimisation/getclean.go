package optimisation

import (
	"context"
	"database/sql"
	"encoding/json"
	"io"
	"net/http"

	"backend/config"
	serverdb "backend/db/gen/server"
)

type hostExtract struct {
	Host string `json:"host"`
}

func GetCleanInfo(queries *serverdb.Queries) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		var req hostExtract
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Host == "" {
			http.Error(w, "Invalid request body", http.StatusBadRequest)
			return
		}

		device, err := queries.GetServerDeviceByIP(context.Background(), req.Host)
		if err == sql.ErrNoRows {
			http.Error(w, "Device not registered", http.StatusNotFound)
			return
		} else if err != nil {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}

		// ✅ Use config for client URL (reads from .env file)
		clientURL := config.GetClientURL(req.Host, "/client/cleaninfo")

		clientReq, err := http.NewRequest("GET", clientURL, nil)
		if err != nil {
			http.Error(w, "Failed to create request to client", http.StatusInternalServerError)
			return
		}
		clientReq.Header.Set("Authorization", "Bearer "+device.AccessToken)
		clientReq.Header.Set("Content-Type", "application/json")

		resp, err := http.DefaultClient.Do(clientReq)
		if err != nil {
			http.Error(w, "Failed to reach client", http.StatusBadGateway)
			return
		}
		defer resp.Body.Close()

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(resp.StatusCode)
		io.Copy(w, resp.Body)
	}
}
