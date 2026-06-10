// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ERC721Base.sol";

/**
 * @title LandNFT - Land parcels as ERC-721 NFTs for CubeCraft Tycoon
 * @notice Each NFT represents a land parcel with coordinates, zone type, and development level
 */
contract LandNFT is ERC721Base {
    // Zone types
    enum ZoneType {
        Commercial,  // 0
        Residential, // 1
        Industrial   // 2
    }

    // Land parcel data
    struct LandParcel {
        int256 x;              // X coordinate
        int256 y;              // Y coordinate
        uint256 width;         // Width in game units
        uint256 height;        // Height in game units
        ZoneType zoneType;     // Zone classification
        uint8 developmentLevel; // 0-5 development level
        bool exists;           // Whether parcel exists
    }

    // Token ID => LandParcel
    mapping(uint256 => LandParcel) public parcels;

    // Owner address => list of owned token IDs
    mapping(address => uint256[]) public ownerParcels;

    // Coordinate key => token ID (for uniqueness check)
    mapping(bytes32 => uint256) public coordinateToToken;

    // Game admin who can mint initial land
    address public gameAdmin;

    // Total parcels minted
    uint256 public totalParcels;

    // Token URI base for metadata
    string private _baseTokenURI;

    // Events
    event LandMinted(uint256 indexed tokenId, address indexed to, int256 x, int256 y, uint256 width, uint256 height, ZoneType zoneType);
    event DevelopmentUpgraded(uint256 indexed tokenId, uint8 oldLevel, uint8 newLevel);
    event ZoneTypeChanged(uint256 indexed tokenId, ZoneType oldZone, ZoneType newZone);
    event BaseURIUpdated(string newBaseURI);

    modifier onlyAdmin() {
        require(msg.sender == gameAdmin, "LandNFT: caller is not admin");
        _;
    }

    modifier parcelExists(uint256 tokenId) {
        require(parcels[tokenId].exists, "LandNFT: parcel does not exist");
        _;
    }

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseTokenURI_,
        address admin_
    ) ERC721Base(name_, symbol_) {
        _baseTokenURI = baseTokenURI_;
        gameAdmin = admin_;
    }

    // ============ Metadata ============

    function tokenURI(uint256 tokenId) public view parcelExists(tokenId) returns (string memory) {
        return bytes(_baseTokenURI).length > 0
            ? string(abi.encodePacked(_baseTokenURI, _toString(tokenId)))
            : "";
    }

    function setBaseURI(string calldata newBaseURI) external onlyAdmin {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    // ============ Minting ============

    /**
     * @notice Mint a single land parcel
     */
    function mintLand(
        address to,
        int256 x,
        int256 y,
        uint256 width,
        uint256 height,
        ZoneType zoneType
    ) external onlyAdmin returns (uint256) {
        require(to != address(0), "LandNFT: mint to zero address");
        require(width > 0 && height > 0, "LandNFT: invalid dimensions");

        bytes32 coordKey = _coordKey(x, y, width, height);
        require(coordinateToToken[coordKey] == 0, "LandNFT: coordinates already occupied");

        uint256 tokenId = ++totalParcels;

        coordinateToToken[coordKey] = tokenId;
        parcels[tokenId] = LandParcel({
            x: x,
            y: y,
            width: width,
            height: height,
            zoneType: zoneType,
            developmentLevel: 0,
            exists: true
        });

        _mint(to, tokenId);
        ownerParcels[to].push(tokenId);

        emit LandMinted(tokenId, to, x, y, width, height, zoneType);
        return tokenId;
    }

    /**
     * @notice Batch mint land parcels
     */
    function mintLandBatch(
        address[] calldata recipients,
        int256[] calldata xs,
        int256[] calldata ys,
        uint256[] calldata widths,
        uint256[] calldata heights,
        ZoneType[] calldata zoneTypes
    ) external onlyAdmin {
        uint256 len = recipients.length;
        require(
            len == xs.length && len == ys.length &&
            len == widths.length && len == heights.length &&
            len == zoneTypes.length,
            "LandNFT: array length mismatch"
        );

        for (uint256 i = 0; i < len; i++) {
            mintLand(recipients[i], xs[i], ys[i], widths[i], heights[i], zoneTypes[i]);
        }
    }

    // ============ Game State ============

    /**
     * @notice Upgrade development level of a parcel (only admin or owner)
     */
    function upgradeDevelopment(uint256 tokenId, uint8 newLevel)
        external
        parcelExists(tokenId)
    {
        require(
            msg.sender == gameAdmin || msg.sender == ownerOf(tokenId),
            "LandNFT: not authorized"
        );
        require(newLevel <= 5, "LandNFT: max level is 5");
        require(newLevel > parcels[tokenId].developmentLevel, "LandNFT: can only upgrade");

        uint8 oldLevel = parcels[tokenId].developmentLevel;
        parcels[tokenId].developmentLevel = newLevel;

        emit DevelopmentUpgraded(tokenId, oldLevel, newLevel);
    }

    /**
     * @notice Change zone type (admin only)
     */
    function changeZoneType(uint256 tokenId, ZoneType newZone)
        external
        onlyAdmin
        parcelExists(tokenId)
    {
        ZoneType oldZone = parcels[tokenId].zoneType;
        parcels[tokenId].zoneType = newZone;
        emit ZoneTypeChanged(tokenId, oldZone, newZone);
    }

    // ============ View Functions ============

    function getParcelData(uint256 tokenId) external view parcelExists(tokenId) returns (LandParcel memory) {
        return parcels[tokenId];
    }

    function getOwnerParcels(address owner) external view returns (uint256[] memory) {
        return ownerParcels[owner];
    }

    function getOwnerParcelCount(address owner) external view returns (uint256) {
        return ownerParcels[owner].length;
    }

    function tokenByCoordinates(int256 x, int256 y, uint256 width, uint256 height)
        external
        view
        returns (uint256)
    {
        return coordinateToToken[_coordKey(x, y, width, height)];
    }

    // ============ Transfer Override ============

    /**
     * @notice Override transfer to update ownerParcels tracking
     */
    function _transfer(address from, address to, uint256 tokenId) internal override {
        super._transfer(from, to, tokenId);

        // Remove from sender's list
        if (from != address(0)) {
            _removeParcelFromOwner(from, tokenId);
        }

        // Add to receiver's list
        if (to != address(0)) {
            ownerParcels[to].push(tokenId);
        }
    }

    // ============ Internal ============

    function _coordKey(int256 x, int256 y, uint256 width, uint256 height)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked(x, y, width, height));
    }

    function _removeParcelFromOwner(address owner, uint256 tokenId) internal {
        uint256[] storage parcels_ = ownerParcels[owner];
        for (uint256 i = 0; i < parcels_.length; i++) {
            if (parcels_[i] == tokenId) {
                parcels_[i] = parcels_[parcels_.length - 1];
                parcels_.pop();
                break;
            }
        }
    }

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
}
